import { API_PREFIX, campusDateTimeToUtc } from '@sh/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { orderedPair } from '../src/common/relationships.js';
import { db } from '../src/db.js';
import {
  addParticipants,
  createTestClock,
  createTestMailer,
  createUser,
  loggedInAgent,
  resetDb,
} from './helpers.js';

// Key cases for removing an account (FR07–FR08, open question Q13).
// The comprehensive product test cases are the team's separate testing assignment.
// The test clock starts at 2026-10-21, 9:00 AM on campus.

const PASSWORD = 'goSpartans1';

let time: ReturnType<typeof createTestClock>;
let app: ReturnType<typeof createApp>;
let sammyId: string;
let anaId: string;

beforeEach(async () => {
  await resetDb();
  time = createTestClock();
  app = createApp({ mailer: createTestMailer().mailer, clock: time.clock });
  sammyId = (await createUser()).id;
  anaId = (await createUser({ email: 'ana.ruiz@sjsu.edu', displayName: 'Ana Ruiz' })).id;
});

afterAll(async () => {
  await db.$disconnect();
});

const sammy = () => loggedInAgent(app);
const ana = () => loggedInAgent(app, 'ana.ruiz@sjsu.edu');
const me = `${API_PREFIX}/users/me`;
const removeSammy = async () => (await sammy()).delete(me).send({ password: PASSWORD }).expect(204);

async function activity(
  organizerId: string,
  { limit = 8, date = '2026-10-22', title = 'Study' } = {},
) {
  const row = await db.activity.create({
    data: {
      title,
      description: 'Bring your notes.',
      type: 'STUDY',
      startAt: campusDateTimeToUtc(date, '16:00'),
      endAt: campusDateTimeToUtc(date, '18:00'),
      location: 'King Library',
      participantLimit: limit,
      organizerId,
      participations: { create: { userId: organizerId, isOrganizer: true } },
    },
  });
  return row.id;
}

async function counts(activityId: string) {
  const row = await db.activity.findUniqueOrThrow({ where: { id: activityId } });
  const rows = await db.participation.count({ where: { activityId } });
  return { status: row.status, count: row.participantCount, rows };
}

describe('DELETE /users/me (FR07)', () => {
  it('needs the right password, and changes nothing without it', async () => {
    const s = await sammy();
    const wrong = await s.delete(me).send({ password: 'not-my-password1' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrong.body.error.fields.password).toBeDefined();
    expect((await s.delete(me).send({})).status).toBe(422);
    expect(await db.user.count({ where: { id: sammyId } })).toBe(1);
    expect((await s.get(me)).status).toBe(200);
  });

  it('ends the session and clears the cookie (FR08e)', async () => {
    const s = await sammy();
    const res = await s.delete(me).send({ password: PASSWORD });
    expect(res.status).toBe(204);
    expect(String(res.headers['set-cookie'])).toMatch(/sh_sid=;/);
    expect(await db.session.count({ where: { userId: sammyId } })).toBe(0);
    expect((await s.get(me)).status).toBe(401);
    const login = await s.post(`${API_PREFIX}/auth/login`).send({
      email: 'sammy.spartan@sjsu.edu',
      password: PASSWORD,
    });
    expect(login.status).toBe(401);
  });

  it('lets the same email register again (FR08)', async () => {
    await removeSammy();
    await request(app)
      .post(`${API_PREFIX}/auth/register`)
      .send({
        email: 'sammy.spartan@sjsu.edu',
        password: PASSWORD,
        displayName: 'Sammy Again',
        interests: ['STUDY'],
        availability: [{ dayOfWeek: 3, start: '16:00', end: '18:00' }],
      })
      .expect(201);
  });
});

describe('removal effects (FR08)', () => {
  it('deletes the student’s own data (a)', async () => {
    const other = await activity(anaId);
    await addParticipants(other, [sammyId]);
    await db.connection.create({ data: orderedPair(sammyId, anaId) });
    await db.block.create({ data: { blockerId: anaId, blockedId: sammyId } });
    await db.notification.create({ data: { recipientId: sammyId, type: 'ACTIVITY_CHANGED' } });
    await db.activityRemoval.create({ data: { activityId: other, userId: sammyId } });
    const ben = await createUser({ email: 'ben.cho@sjsu.edu', displayName: 'Ben Cho' });
    await db.connectionRequest.create({ data: { senderId: sammyId, recipientId: ben.id } });

    await removeSammy();

    expect(await db.user.count({ where: { id: sammyId } })).toBe(0);
    expect(await db.availabilitySlot.count({ where: { userId: sammyId } })).toBe(0);
    expect(await db.connection.count()).toBe(0);
    expect(await db.connectionRequest.count()).toBe(0);
    expect(await db.block.count()).toBe(0);
    expect(await db.notification.count({ where: { recipientId: sammyId } })).toBe(0);
    expect(await db.activityRemoval.count()).toBe(0);
  });

  it('gives back spots in joined activities and tells the organizer, without the name (b)', async () => {
    const full = await activity(anaId, { limit: 2 });
    await addParticipants(full, [sammyId]);
    await db.activity.update({ where: { id: full }, data: { status: 'FULL' } });

    await removeSammy();

    expect(await counts(full)).toEqual({ status: 'OPEN', count: 1, rows: 1 });
    const notes = await db.notification.findMany({ where: { recipientId: anaId } });
    expect(notes).toMatchObject([
      { type: 'PARTICIPANT_LEFT', activityId: full, actorId: null, body: 'Deleted Student left.' },
    ]);
  });

  it('keeps the count right on past activities, which stay as they were', async () => {
    const past = await activity(anaId, { date: '2026-10-21', title: 'Past', limit: 2 });
    await addParticipants(past, [sammyId]);
    await db.activity.update({ where: { id: past }, data: { status: 'FULL' } });
    time.advanceHours(10); // 7:00 PM on campus: ended

    await removeSammy();

    expect(await counts(past)).toEqual({ status: 'FULL', count: 1, rows: 1 });
    expect(await db.notification.count({ where: { recipientId: anaId } })).toBe(0);
  });

  it('cancels upcoming organized activities and notifies participants (c)', async () => {
    const upcoming = await activity(sammyId);
    await addParticipants(upcoming, [anaId]);

    await removeSammy();

    expect(await counts(upcoming)).toEqual({ status: 'CANCELLED', count: 1, rows: 1 });
    const row = await db.activity.findUniqueOrThrow({ where: { id: upcoming } });
    expect(row.organizerId).toBeNull();
    expect(await db.notification.findMany({ where: { recipientId: anaId } })).toMatchObject([
      {
        type: 'ACTIVITY_CANCELLED',
        activityId: upcoming,
        actorId: null,
        body: 'The organizer removed their account.',
      },
    ]);
    const detail = await (await ana()).get(`${API_PREFIX}/activities/${upcoming}`);
    expect(detail.body).toMatchObject({
      status: 'CANCELLED',
      organizer: { id: null, displayName: 'Deleted Student' },
    });
  });

  it('keeps past organized activities, showing "Deleted Student" (Q13)', async () => {
    const past = await activity(sammyId, { date: '2026-10-21' });
    await addParticipants(past, [anaId]);
    time.advanceHours(10); // 7:00 PM on campus: ended

    await removeSammy();

    expect(await counts(past)).toMatchObject({ count: 1, rows: 1 });
    const detail = await (await ana()).get(`${API_PREFIX}/activities/${past}`);
    expect(detail.body).toMatchObject({
      status: 'COMPLETED',
      organizer: { id: null, displayName: 'Deleted Student' },
    });
  });

  it('keeps group chat messages, shown as "Deleted Student" (d)', async () => {
    const id = await activity(anaId);
    await addParticipants(id, [sammyId]);
    const chat = `${API_PREFIX}/activities/${id}/messages`;
    await (await sammy()).post(chat).send({ body: 'Bye all' }).expect(201);

    await removeSammy();

    const res = await (await ana()).get(chat);
    expect(res.body).toMatchObject([
      { body: 'Bye all', sender: { id: null, displayName: 'Deleted Student' } },
    ]);
  });

  it('removes the conversation for the other student too (Q13)', async () => {
    await db.connection.create({ data: orderedPair(sammyId, anaId) });
    const thread = `${API_PREFIX}/conversations/${sammyId}/messages`;
    const a = await ana();
    await a.post(thread).send({ body: 'Hi' }).expect(201);

    await removeSammy();

    expect(await db.conversation.count()).toBe(0);
    expect(await db.directMessage.count()).toBe(0);
    expect((await a.get(`${API_PREFIX}/conversations`)).body).toEqual([]);
    expect((await a.get(thread)).status).toBe(404);
  });

  it('removes the student’s name from notifications other students already have', async () => {
    const id = await activity(anaId);
    await (await sammy()).post(`${API_PREFIX}/activities/${id}/join`).expect(200);
    const joined = await db.notification.findFirst({ where: { recipientId: anaId } });
    expect(joined?.body).toBe('Sammy Spartan joined.');
    await db.connection.create({ data: orderedPair(sammyId, anaId) });

    await removeSammy();

    const bodies = (await db.notification.findMany({ where: { recipientId: anaId } })).map(
      (note) => note.body ?? '',
    );
    expect(bodies.join(' ')).not.toContain('Sammy');
  });

  it('keeps reports with empty references (Q13)', async () => {
    const report = await db.report.create({
      data: { reporterId: sammyId, targetUserId: anaId, reason: 'SPAM' },
    });
    const about = await db.report.create({
      data: { reporterId: anaId, targetUserId: sammyId, reason: 'OTHER' },
    });

    await removeSammy();

    expect(await db.report.findUnique({ where: { id: report.id } })).toMatchObject({
      reporterId: null,
      targetUserId: anaId,
    });
    expect(await db.report.findUnique({ where: { id: about.id } })).toMatchObject({
      reporterId: anaId,
      targetUserId: null,
    });
  });
});
