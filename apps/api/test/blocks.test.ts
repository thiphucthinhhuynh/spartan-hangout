import { API_PREFIX, campusDateTimeToUtc } from '@sh/shared';
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

// Key cases for blocking (FR54–FR57): each side effect, and the audit of every path it touches.
// The comprehensive product test cases are the team's separate testing assignment.
// The test clock starts at Wednesday 2026-10-21, 9:00 AM on campus. Both students like Study and
// are free on Wednesdays from 4:00 to 6:00 PM (createUser's defaults).

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
const block = async (userId = anaId) =>
  (await sammy()).post(`${API_PREFIX}/blocks`).send({ userId });

async function activity(
  organizerId: string,
  { limit = 8, date = '2026-10-21', title = 'Study' } = {},
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

describe('POST /blocks (FR54)', () => {
  it('records the block and tells nobody', async () => {
    const res = await block();
    expect(res.status).toBe(204);
    expect(await db.block.findMany()).toMatchObject([{ blockerId: sammyId, blockedId: anaId }]);
    expect(await db.notification.count()).toBe(0);
  });

  it('refuses yourself and unknown students, and can be repeated safely', async () => {
    expect((await block(sammyId)).status).toBe(403);
    expect((await block('00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect(
      (await (await sammy()).post(`${API_PREFIX}/blocks`).send({ userId: 'nope' })).status,
    ).toBe(422);

    await block();
    expect((await block()).status).toBe(204);
    expect(await db.block.count()).toBe(1);
  });
});

describe('block effects (FR55)', () => {
  it('ends the connection and refuses DMs both ways; the conversation row stays', async () => {
    await db.connection.create({ data: orderedPair(sammyId, anaId) });
    const a = await ana();
    await a
      .post(`${API_PREFIX}/conversations/${sammyId}/messages`)
      .send({ body: 'Hi' })
      .expect(201);

    await block();
    expect(await db.connection.count()).toBe(0);
    expect(await db.conversation.count()).toBe(1);

    expect(
      (await a.post(`${API_PREFIX}/conversations/${sammyId}/messages`).send({ body: 'Hi?' }))
        .status,
    ).toBe(404);
    expect((await a.get(`${API_PREFIX}/conversations/${sammyId}/messages`)).status).toBe(404);
    expect((await a.get(`${API_PREFIX}/conversations`)).body).toEqual([]);
    const s = await sammy();
    expect((await s.get(`${API_PREFIX}/conversations/${anaId}/messages`)).status).toBe(404);
  });

  it('deletes a pending request in either direction and refuses new ones', async () => {
    const a = await ana();
    await a.post(`${API_PREFIX}/connections/requests`).send({ recipientId: sammyId }).expect(201);
    await block();
    expect(await db.connectionRequest.count()).toBe(0);

    const again = await a.post(`${API_PREFIX}/connections/requests`).send({ recipientId: sammyId });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('CONNECTION_NOT_ALLOWED');
    expect(again.body.error.message).not.toMatch(/block/i);
    const back = await (
      await sammy()
    )
      .post(`${API_PREFIX}/connections/requests`)
      .send({ recipientId: anaId });
    expect(back.status).toBe(409);
  });

  it('hides the blocked student’s chat messages from the blocker only', async () => {
    const id = await activity(anaId);
    await addParticipants(id, [sammyId]);
    const chat = `${API_PREFIX}/activities/${id}/messages`;
    const a = await ana();
    await a.post(chat).send({ body: 'From Ana' }).expect(201);
    const s = await sammy();
    await s.post(chat).send({ body: 'From Sammy' }).expect(201);

    await block();
    expect((await s.get(chat)).body.map((m: { body: string }) => m.body)).toEqual(['From Sammy']);
    expect((await a.get(chat)).body.map((m: { body: string }) => m.body)).toEqual([
      'From Ana',
      'From Sammy',
    ]);
  });
});

describe('upcoming activities (FR56)', () => {
  it('removes the blocked student, reopens a Full activity, and says only "removed"', async () => {
    const id = await activity(sammyId, { limit: 2 });
    await addParticipants(id, [anaId]);
    await db.activity.update({ where: { id }, data: { status: 'FULL' } });

    await block();

    const row = await db.activity.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ status: 'OPEN', participantCount: 1 });
    expect(await db.participation.count({ where: { activityId: id } })).toBe(1);
    expect(await db.activityRemoval.findMany()).toMatchObject([
      { activityId: id, userId: anaId, reason: null },
    ]);

    const notes = await db.notification.findMany();
    expect(notes).toMatchObject([
      { recipientId: anaId, type: 'REMOVED_FROM_ACTIVITY', activityId: id, body: null },
    ]);

    // The student sees the usual removal wording, with no mention of a block.
    const a = await ana();
    const detail = await a.get(`${API_PREFIX}/activities/${id}`);
    expect(detail.body.joinBlockedReason).toMatch(/removed you/);
    expect(detail.body.joinBlockedReason).not.toMatch(/block/i);
    const join = await a.post(`${API_PREFIX}/activities/${id}/join`);
    expect(join.body.error.code).toBe('REMOVED_FROM_ACTIVITY');
  });

  it('keeps started activities, and the blocker’s place in the blocked student’s', async () => {
    const started = await activity(sammyId, { title: 'Started' });
    await addParticipants(started, [anaId]);
    const theirs = await activity(anaId, { title: 'Theirs' });
    await addParticipants(theirs, [sammyId]);

    time.advanceHours(8); // 5:00 PM on campus: both have started
    await block();

    expect(await db.participation.count({ where: { activityId: started } })).toBe(2);
    expect(await db.participation.count({ where: { activityId: theirs } })).toBe(2);
    expect(await db.notification.count()).toBe(0);
  });

  it('stops the blocked student joining the blocker’s activities, with generic wording', async () => {
    const id = await activity(sammyId);
    await block();
    const res = await (await ana()).post(`${API_PREFIX}/activities/${id}/join`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('JOIN_NOT_ALLOWED');
    expect(res.body.error.message).not.toMatch(/block/i);
  });
});

describe('hidden from each other (FR57)', () => {
  it('in Discover, search, Recommended and profiles, in both directions', async () => {
    await activity(anaId, { title: 'By Ana' });
    await activity(sammyId, { title: 'By Sammy' });

    const titles = async (agent: Awaited<ReturnType<typeof sammy>>, path: string) =>
      (await agent.get(`${API_PREFIX}${path}`)).body.items.map((i: { title: string }) => i.title);
    const s = await sammy();
    const a = await ana();
    expect(await titles(s, '/activities/recommended')).toEqual(['By Ana']);
    expect((await s.get(`${API_PREFIX}/connections/discover`)).body.items).toHaveLength(1);

    await block();

    for (const [agent, other, own] of [
      [s, anaId, 'By Sammy'],
      [a, sammyId, 'By Ana'],
    ] as const) {
      expect(await titles(agent, '/activities')).toEqual([own]);
      expect(await titles(agent, '/activities/recommended')).toEqual([]);
      expect((await agent.get(`${API_PREFIX}/connections/discover`)).body.items).toEqual([]);
      expect((await agent.get(`${API_PREFIX}/users/${other}`)).status).toBe(404);
    }
  });

  it('in the connection list and for reports', async () => {
    await db.connection.create({ data: orderedPair(sammyId, anaId) });
    await block();
    const a = await ana();
    expect((await a.get(`${API_PREFIX}/connections`)).body.items).toEqual([]);
    const report = await a
      .post(`${API_PREFIX}/reports`)
      .send({ targetUserId: sammyId, reason: 'SPAM' });
    expect(report.status).toBe(404);
  });
});
