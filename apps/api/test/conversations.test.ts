import { API_PREFIX } from '@sh/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { orderedPair } from '../src/common/relationships.js';
import { db } from '../src/db.js';
import {
  createTestClock,
  createTestMailer,
  createUser,
  loggedInAgent,
  resetDb,
} from './helpers.js';

// Key cases for direct messages (FR47–FR49).
// The comprehensive product test cases are the team's separate testing assignment.

let time: ReturnType<typeof createTestClock>;
let app: ReturnType<typeof createApp>;
let sammyId: string;
let anaId: string;
let benId: string;

beforeEach(async () => {
  await resetDb();
  time = createTestClock();
  app = createApp({ mailer: createTestMailer().mailer, clock: time.clock });
  sammyId = (await createUser()).id;
  anaId = (await createUser({ email: 'ana.ruiz@sjsu.edu', displayName: 'Ana Ruiz' })).id;
  benId = (await createUser({ email: 'ben.cho@sjsu.edu', displayName: 'Ben Cho' })).id;
  await db.connection.create({ data: orderedPair(sammyId, anaId) });
});

afterAll(async () => {
  await db.$disconnect();
});

const sammy = () => loggedInAgent(app);
const ana = () => loggedInAgent(app, 'ana.ruiz@sjsu.edu');
const ben = () => loggedInAgent(app, 'ben.cho@sjsu.edu');
const thread = (userId: string) => `${API_PREFIX}/conversations/${userId}/messages`;

describe('direct messages (FR47–FR49)', () => {
  it('lets connected students send and read, oldest first, with sender and time', async () => {
    const s = await sammy();
    const a = await ana();
    expect((await s.get(thread(anaId))).body).toEqual([]);

    const first = await s.post(thread(anaId)).send({ body: '  Coffee later?  ' });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      body: 'Coffee later?',
      sender: { id: sammyId, displayName: 'Sammy Spartan' },
      createdAt: '2026-10-21T16:00:00.000Z',
    });
    // Same timestamp on purpose: order still follows insertion.
    await a.post(thread(sammyId)).send({ body: 'Sure!' }).expect(201);

    const read = await a.get(thread(sammyId));
    expect(read.body.map((m: { body: string }) => m.body)).toEqual(['Coffee later?', 'Sure!']);
    const after = await s.get(`${thread(anaId)}?after=${first.body.id}`);
    expect(after.body.map((m: { body: string }) => m.body)).toEqual(['Sure!']);
  });

  it('rejects empty, whitespace-only and over-long messages (FR47, Q18)', async () => {
    const s = await sammy();
    for (const body of ['', '   ', 'a'.repeat(501)]) {
      const res = await s.post(thread(anaId)).send({ body });
      expect(res.status).toBe(422);
      expect(res.body.error.fields.body).toBeDefined();
    }
    expect(await db.conversation.count()).toBe(0);
  });

  it('refuses students who are not connected (FR48)', async () => {
    const b = await ben();
    for (const res of [
      await b.get(thread(sammyId)),
      await b.post(thread(sammyId)).send({ body: 'Hi' }),
    ]) {
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('NOT_CONNECTED');
    }
    expect(await db.directMessage.count()).toBe(0);
  });

  it('ends all access when the connection ends, but keeps the conversation (FR48)', async () => {
    const s = await sammy();
    await s.post(thread(anaId)).send({ body: 'Hi' }).expect(201);
    await db.connection.deleteMany();

    expect((await s.get(thread(anaId))).body.error.code).toBe('NOT_CONNECTED');
    expect((await s.post(thread(anaId)).send({ body: 'Hello?' })).status).toBe(409);
    expect((await s.get(`${API_PREFIX}/conversations`)).body).toEqual([]);
    expect(await db.conversation.count()).toBe(1);
  });

  it('hides missing, blocked and malformed students, and yourself, behind 404 (FR57)', async () => {
    const s = await sammy();
    await db.block.create({ data: { blockerId: anaId, blockedId: sammyId } });
    for (const id of [anaId, sammyId, 'nope', '00000000-0000-4000-8000-000000000000']) {
      expect((await s.get(thread(id))).status).toBe(404);
    }
    expect((await s.get(`${API_PREFIX}/conversations`)).body).toEqual([]);
  });

  it('notifies the recipient with a link to the conversation, not the text (FR49)', async () => {
    await (await sammy()).post(thread(anaId)).send({ body: 'Secret plan' }).expect(201);

    const a = await ana();
    const { items } = (await a.get(`${API_PREFIX}/notifications`)).body;
    expect(items).toMatchObject([
      {
        type: 'DIRECT_MESSAGE',
        conversationUserId: sammyId,
        actorId: sammyId,
        body: 'Sammy Spartan sent you a message.',
        read: false,
      },
    ]);
    expect(await db.notification.count({ where: { recipientId: sammyId } })).toBe(0);
  });

  it('lists conversations most recent first, with the other student and last message', async () => {
    await db.connection.create({ data: orderedPair(sammyId, benId) });
    const s = await sammy();
    await s.post(thread(anaId)).send({ body: 'To Ana' }).expect(201);
    time.advanceMinutes(1);
    await s.post(thread(benId)).send({ body: 'To Ben' }).expect(201);

    const list = (await s.get(`${API_PREFIX}/conversations`)).body;
    expect(list).toEqual([
      {
        otherUser: { id: benId, displayName: 'Ben Cho' },
        lastMessage: { body: 'To Ben', senderId: sammyId },
        lastMessageAt: '2026-10-21T16:01:00.000Z',
      },
      expect.objectContaining({ otherUser: { id: anaId, displayName: 'Ana Ruiz' } }),
    ]);

    // A reply moves that conversation back to the top, for both students.
    time.advanceMinutes(1);
    await (await ana()).post(thread(sammyId)).send({ body: 'Hi Sammy' }).expect(201);
    const reordered = (await s.get(`${API_PREFIX}/conversations`)).body;
    expect(reordered[0]).toMatchObject({
      otherUser: { id: anaId },
      lastMessage: { body: 'Hi Sammy', senderId: anaId },
    });
  });

  it('creates one conversation when both students send their first message at once', async () => {
    const [s, a] = await Promise.all([sammy(), ana()]);
    const results = await Promise.all([
      s.post(thread(anaId)).send({ body: 'Hi Ana' }),
      a.post(thread(sammyId)).send({ body: 'Hi Sammy' }),
    ]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(await db.conversation.count()).toBe(1);
    expect(await db.directMessage.count()).toBe(2);
  });
});
