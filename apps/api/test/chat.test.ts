import { API_PREFIX, campusDateTimeToUtc } from '@sh/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';
import {
  addParticipants,
  createTestClock,
  createTestMailer,
  createUser,
  loggedInAgent,
  resetDb,
} from './helpers.js';

// Key cases for the activity group chat and organizer updates (FR35–FR39, FR40c, FR55c).
// The comprehensive product test cases are the team's separate testing assignment.
// The test clock starts at 2026-10-21, 9:00 AM on campus; the activity runs 4–6 PM that day.

let time: ReturnType<typeof createTestClock>;
let app: ReturnType<typeof createApp>;
let organizerId: string;
let sammyId: string;
let alexId: string;
let activityId: string;

beforeEach(async () => {
  await resetDb();
  time = createTestClock();
  app = createApp({ mailer: createTestMailer().mailer, clock: time.clock });
  organizerId = (await createUser({ email: 'maya.chen@sjsu.edu', displayName: 'Maya Chen' })).id;
  sammyId = (await createUser()).id;
  alexId = (await createUser({ email: 'alex.rivera@sjsu.edu', displayName: 'Alex Rivera' })).id;
  const activity = await db.activity.create({
    data: {
      title: 'Midterm Study Group',
      description: 'Bring your notes.',
      type: 'STUDY',
      startAt: campusDateTimeToUtc('2026-10-21', '16:00'),
      endAt: campusDateTimeToUtc('2026-10-21', '18:00'),
      location: 'King Library',
      participantLimit: 8,
      organizerId,
      participations: { create: { userId: organizerId, isOrganizer: true } },
    },
  });
  activityId = activity.id;
  await addParticipants(activityId, [sammyId]);
});

afterAll(async () => {
  await db.$disconnect();
});

const organizer = () => loggedInAgent(app, 'maya.chen@sjsu.edu');
const sammy = () => loggedInAgent(app);
const alex = () => loggedInAgent(app, 'alex.rivera@sjsu.edu');
const chat = () => `${API_PREFIX}/activities/${activityId}/messages`;

async function bodies(agent: Awaited<ReturnType<typeof sammy>>, query = '') {
  const res = await agent.get(`${chat()}${query}`);
  expect(res.status).toBe(200);
  return (res.body as { body: string }[]).map((m) => m.body);
}

describe('group chat (FR35–FR37)', () => {
  it('lets participants send and read, oldest first, with sender and time', async () => {
    const s = await sammy();
    const sent = await s.post(chat()).send({ body: '  Saving seats by the window  ' });
    expect(sent.status).toBe(201);
    expect(sent.body).toMatchObject({
      kind: 'MESSAGE',
      body: 'Saving seats by the window',
      sender: { id: sammyId, displayName: 'Sammy Spartan' },
      createdAt: '2026-10-21T16:00:00.000Z',
    });
    // Same timestamp on purpose: order still follows insertion.
    await (await organizer()).post(chat()).send({ body: 'Thanks!' }).expect(201);

    expect(await bodies(s)).toEqual(['Saving seats by the window', 'Thanks!']);
    expect(await bodies(s, `?after=${sent.body.id}`)).toEqual(['Thanks!']);
  });

  it('rejects empty, whitespace-only and over-long messages (FR36, Q18)', async () => {
    const s = await sammy();
    for (const body of ['', '   ', 'a'.repeat(501)]) {
      const res = await s.post(chat()).send({ body });
      expect(res.status).toBe(422);
      expect(res.body.error.fields.body).toBeDefined();
    }
  });

  it('is closed to outsiders, and access ends after leaving or removal', async () => {
    const a = await alex();
    expect((await a.get(chat())).status).toBe(403);
    expect((await a.post(chat()).send({ body: 'Hi' })).status).toBe(403);

    await addParticipants(activityId, [alexId]);
    expect((await a.get(chat())).status).toBe(200);
    await a.post(`${API_PREFIX}/activities/${activityId}/leave`).expect(200);
    expect((await a.get(chat())).status).toBe(403);

    await (
      await organizer()
    )
      .delete(`${API_PREFIX}/activities/${activityId}/participants/${sammyId}`)
      .expect(204);
    expect((await (await sammy()).get(chat())).status).toBe(403);
  });

  it('becomes read-only once the activity is cancelled; members can still read it', async () => {
    const s = await sammy();
    await s.post(chat()).send({ body: 'See you there' }).expect(201);
    await (await organizer()).post(`${API_PREFIX}/activities/${activityId}/cancel`).expect(200);

    const res = await s.post(chat()).send({ body: 'Oh no' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CHAT_READ_ONLY');
    expect(await bodies(s)).toEqual(['See you there']);
    // Outsiders can't tell a cancelled activity exists (FR32).
    expect((await (await alex()).get(chat())).status).toBe(404);
  });

  it('becomes read-only once the activity is completed', async () => {
    time.advanceHours(10); // 7:00 PM on campus: ended
    const res = await (await sammy()).post(chat()).send({ body: 'Thanks all' });
    expect(res.body.error.code).toBe('CHAT_READ_ONLY');
  });

  it('hides messages from a student the viewer blocked, for the viewer only (FR55c)', async () => {
    await (await sammy()).post(chat()).send({ body: 'From Sammy' }).expect(201);
    await (await organizer()).post(chat()).send({ body: 'From Maya' }).expect(201);
    await db.block.create({ data: { blockerId: organizerId, blockedId: sammyId } });

    expect(await bodies(await organizer())).toEqual(['From Maya']);
    expect(await bodies(await sammy())).toEqual(['From Sammy', 'From Maya']);
  });

  it('shows "Deleted Student" for a sender whose account is gone (FR08)', async () => {
    await (await sammy()).post(chat()).send({ body: 'Bye' }).expect(201);
    await db.activityMessage.updateMany({ data: { senderId: null } });
    const res = await (await organizer()).get(chat());
    expect(res.body[0].sender).toEqual({ id: null, displayName: 'Deleted Student' });
  });
});

describe('POST /activities/:id/updates (FR38–FR39, FR40c)', () => {
  const updates = () => `${API_PREFIX}/activities/${activityId}/updates`;

  it('posts a labeled update and notifies the other participants', async () => {
    await addParticipants(activityId, [alexId]);
    const res = await (await organizer()).post(updates()).send({ body: 'Moved to room 225' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ kind: 'UPDATE', sender: { id: organizerId } });

    for (const id of [sammyId, alexId]) {
      const note = await db.notification.findFirst({ where: { recipientId: id } });
      expect(note).toMatchObject({
        type: 'ACTIVITY_UPDATE',
        body: 'Moved to room 225',
        activityId,
      });
    }
    expect(await db.notification.count({ where: { recipientId: organizerId } })).toBe(0);
    expect(await bodies(await sammy())).toEqual(['Moved to room 225']);
  });

  it('is organizer-only, allowed after the start (Q22), and closed once ended', async () => {
    expect((await (await sammy()).post(updates()).send({ body: 'Hi' })).status).toBe(403);

    time.advanceHours(8); // 5:00 PM: started, not ended
    await (await organizer()).post(updates()).send({ body: 'Running late' }).expect(201);

    time.advanceHours(2); // 7:00 PM: completed
    const res = await (await organizer()).post(updates()).send({ body: 'Thanks' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACTIVITY_NOT_OPEN');
  });
});
