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

// Key cases for student discovery and connections (FR13, FR43–FR46).
// The comprehensive product test cases are the team's separate testing assignment.

type Interest = 'STUDY' | 'SPORTS' | 'FOOD' | 'SOCIAL' | 'GAMING';

let app: ReturnType<typeof createApp>;
let sammyId: string;

beforeEach(async () => {
  await resetDb();
  app = createApp({ mailer: createTestMailer().mailer, clock: createTestClock().clock });
  sammyId = (await createUser({ interests: ['STUDY', 'SPORTS', 'FOOD'] })).id;
});

afterAll(async () => {
  await db.$disconnect();
});

async function student(name: string, interests: Interest[]) {
  const email = `${name.toLowerCase().replace(' ', '.')}@sjsu.edu`;
  const user = await createUser({ email, displayName: name, interests });
  return { id: user.id, agent: () => loggedInAgent(app, email) };
}
const sammy = () => loggedInAgent(app);

describe('GET /connections/discover (FR43–FR44)', () => {
  it('lists students by shared interests, then name, excluding self, blocked and connected', async () => {
    await student('Zoe Park', ['STUDY', 'SPORTS']);
    await student('Ana Ruiz', ['STUDY']);
    await student('Ben Cho', ['FOOD', 'SPORTS', 'GAMING']);
    await student('No Overlap', ['GAMING']);
    const blocked = await student('Blocked Kim', ['STUDY']);
    const friend = await student('Friend Lee', ['STUDY']);
    await createUser({
      email: 'pending@sjsu.edu',
      interests: ['STUDY'],
      status: 'PENDING_VERIFICATION',
    });
    await db.block.create({ data: { blockerId: blocked.id, blockedId: sammyId } });
    await db.connection.create({ data: orderedPair(sammyId, friend.id) });

    const res = await (await sammy()).get(`${API_PREFIX}/connections/discover`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([
      expect.objectContaining({ displayName: 'Ben Cho', sharedInterests: ['SPORTS', 'FOOD'] }),
      expect.objectContaining({ displayName: 'Zoe Park', sharedInterests: ['STUDY', 'SPORTS'] }),
      expect.objectContaining({
        displayName: 'Ana Ruiz',
        sharedInterests: ['STUDY'],
        connectionState: 'none',
      }),
    ]);
  });
});

describe('connection requests (FR45–FR46)', () => {
  it('sends a request, notifies the recipient, and shows it as pending both ways', async () => {
    const ana = await student('Ana Ruiz', ['STUDY']);
    const res = await (
      await sammy()
    )
      .post(`${API_PREFIX}/connections/requests`)
      .send({ recipientId: ana.id });
    expect(res.status).toBe(201);

    const note = await db.notification.findFirst({ where: { recipientId: ana.id } });
    expect(note).toMatchObject({
      type: 'CONNECTION_REQUEST',
      actorId: sammyId,
      body: 'Sammy Spartan wants to connect.',
    });

    const mine = await (await sammy()).get(`${API_PREFIX}/users/${ana.id}`);
    expect(mine.body.connectionState).toBe('pending_outgoing');
    const theirs = await (await ana.agent()).get(`${API_PREFIX}/users/${sammyId}`);
    expect(theirs.body.connectionState).toBe('pending_incoming');
    const incoming = await (
      await ana.agent()
    ).get(`${API_PREFIX}/connections/requests?direction=incoming`);
    expect(incoming.body).toMatchObject([
      { id: res.body.id, student: { id: sammyId, displayName: 'Sammy Spartan' } },
    ]);
  });

  it('rejects every FR45 case, including a request in the opposite direction', async () => {
    const ana = await student('Ana Ruiz', ['STUDY']);
    const blocked = await student('Blocked Kim', ['STUDY']);
    const friend = await student('Friend Lee', ['STUDY']);
    await db.block.create({ data: { blockerId: sammyId, blockedId: blocked.id } });
    await db.connection.create({ data: orderedPair(sammyId, friend.id) });
    const s = await sammy();
    const send = (recipientId: string) =>
      s.post(`${API_PREFIX}/connections/requests`).send({ recipientId });

    for (const id of [sammyId, blocked.id, friend.id]) {
      const res = await send(id);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONNECTION_NOT_ALLOWED');
    }
    expect((await send('00000000-0000-4000-8000-000000000000')).status).toBe(404);

    await send(ana.id).expect(201);
    expect((await send(ana.id)).body.error.code).toBe('CONNECTION_NOT_ALLOWED');
    const opposite = await (
      await ana.agent()
    )
      .post(`${API_PREFIX}/connections/requests`)
      .send({ recipientId: sammyId });
    expect(opposite.status).toBe(409);
    expect(opposite.body.error.message).toMatch(/already sent you a request/);
    expect(await db.connectionRequest.count()).toBe(1);
  });

  it('accepting connects both students and notifies the sender', async () => {
    const ana = await student('Ana Ruiz', ['STUDY']);
    const { body } = await (
      await sammy()
    )
      .post(`${API_PREFIX}/connections/requests`)
      .send({ recipientId: ana.id });

    // Only the recipient can answer.
    expect(
      (await (await sammy()).post(`${API_PREFIX}/connections/requests/${body.id}/accept`)).status,
    ).toBe(404);
    await (
      await ana.agent()
    )
      .post(`${API_PREFIX}/connections/requests/${body.id}/accept`)
      .expect(204);

    expect(await db.connectionRequest.count()).toBe(0);
    const profile = await (await sammy()).get(`${API_PREFIX}/users/${ana.id}`);
    expect(profile.body.connectionState).toBe('connected');
    const note = await db.notification.findFirst({ where: { recipientId: sammyId } });
    expect(note).toMatchObject({ type: 'CONNECTION_ACCEPTED', actorId: ana.id });
    const list = await (await sammy()).get(`${API_PREFIX}/connections`);
    expect(list.body.items).toMatchObject([{ id: ana.id, connectionState: 'connected' }]);
  });

  it('declining deletes the request without telling the sender', async () => {
    const ana = await student('Ana Ruiz', ['STUDY']);
    const { body } = await (
      await sammy()
    )
      .post(`${API_PREFIX}/connections/requests`)
      .send({ recipientId: ana.id });
    await (
      await ana.agent()
    )
      .post(`${API_PREFIX}/connections/requests/${body.id}/decline`)
      .expect(204);

    expect(await db.connectionRequest.count()).toBe(0);
    expect(await db.connection.count()).toBe(0);
    expect(await db.notification.count({ where: { recipientId: sammyId } })).toBe(0);
    // They can try again later.
    await (
      await sammy()
    )
      .post(`${API_PREFIX}/connections/requests`)
      .send({ recipientId: ana.id })
      .expect(201);
  });
});
