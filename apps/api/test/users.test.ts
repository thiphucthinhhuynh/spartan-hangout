import { API_PREFIX } from '@sh/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';
import {
  createTestClock,
  createTestMailer,
  createUser,
  loggedInAgent,
  resetDb,
} from './helpers.js';

// Key cases for profiles (FR05–FR06, FR12–FR13).
// The comprehensive product test cases are the team's separate testing assignment.

let time: ReturnType<typeof createTestClock>;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  await resetDb();
  time = createTestClock();
  app = createApp({ mailer: createTestMailer().mailer, clock: time.clock });
});

afterAll(async () => {
  await db.$disconnect();
});

describe('GET /users/me (FR12)', () => {
  it('shows the student their own profile, including their email', async () => {
    const me = await createUser();
    const agent = await loggedInAgent(app);

    const res = await agent.get(`${API_PREFIX}/users/me`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: me.id,
      email: 'sammy.spartan@sjsu.edu',
      displayName: 'Sammy Spartan',
      interests: ['STUDY'],
      availability: [{ dayOfWeek: 3, start: '16:00', end: '18:00' }],
    });
  });

  it('requires logging in (FR10)', async () => {
    expect((await request(app).get(`${API_PREFIX}/users/me`)).status).toBe(401);
  });
});

describe('PATCH /users/me (FR05–FR06)', () => {
  it('updates the profile in place and records when, but never the email', async () => {
    const me = await createUser();
    const agent = await loggedInAgent(app);
    time.advanceMinutes(10); // within the 30-minute session idle limit

    const res = await agent.patch(`${API_PREFIX}/users/me`).send({
      displayName: '  Sam  ',
      interests: ['FOOD', 'GAMING'],
      availability: [
        { dayOfWeek: 5, start: '18:00', end: '21:00' },
        { dayOfWeek: 1, start: '09:00', end: '11:30' },
      ],
      email: 'someone.else@sjsu.edu',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: 'sammy.spartan@sjsu.edu',
      displayName: 'Sam',
      interests: ['FOOD', 'GAMING'],
      availability: [
        { dayOfWeek: 1, start: '09:00', end: '11:30' },
        { dayOfWeek: 5, start: '18:00', end: '21:00' },
      ],
    });
    expect(res.body.updatedAt).toBe(time.clock.now().toISOString());

    expect(await db.user.count()).toBe(1); // updated, not duplicated
    expect(await db.availabilitySlot.count({ where: { userId: me.id } })).toBe(2);
  });

  it('counts an availability-only edit as an update', async () => {
    await createUser();
    const agent = await loggedInAgent(app);
    time.advanceMinutes(20);

    const res = await agent
      .patch(`${API_PREFIX}/users/me`)
      .send({ availability: [{ dayOfWeek: 0, start: '12:00', end: '14:00' }] });
    expect(res.status).toBe(200);
    expect(res.body.updatedAt).toBe(time.clock.now().toISOString());
  });

  it('saves nothing and identifies each invalid field', async () => {
    const me = await createUser();
    const agent = await loggedInAgent(app);

    const res = await agent.patch(`${API_PREFIX}/users/me`).send({
      displayName: 'x'.repeat(51),
      interests: [],
      availability: [{ dayOfWeek: 2, start: '15:00', end: '14:00' }],
    });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'availability.0.end',
      'displayName',
      'interests',
    ]);

    const unchanged = await db.user.findUniqueOrThrow({
      where: { id: me.id },
      include: { availability: true },
    });
    expect(unchanged.displayName).toBe('Sammy Spartan');
    expect(unchanged.availability).toHaveLength(1);
  });
});

describe('GET /users/:id (FR13)', () => {
  it('shows another student without their email, marking shared interests', async () => {
    await createUser({ interests: ['STUDY', 'GAMING'] });
    const other = await createUser({
      email: 'alex.rivera@sjsu.edu',
      displayName: 'Alex Rivera',
      interests: ['SPORTS', 'GAMING'],
    });
    const agent = await loggedInAgent(app);

    const res = await agent.get(`${API_PREFIX}/users/${other.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: other.id,
      displayName: 'Alex Rivera',
      interests: [
        { type: 'SPORTS', shared: false },
        { type: 'GAMING', shared: true },
      ],
      availability: [{ dayOfWeek: 3, start: '16:00', end: '18:00' }],
      connectionState: 'none',
    });
  });

  it('reports a connection when one exists', async () => {
    const me = await createUser();
    const other = await createUser({ email: 'alex.rivera@sjsu.edu' });
    const [userAId, userBId] = [me.id, other.id].sort() as [string, string];
    await db.connection.create({ data: { userAId, userBId } });
    const agent = await loggedInAgent(app);

    const res = await agent.get(`${API_PREFIX}/users/${other.id}`);
    expect(res.body.connectionState).toBe('connected');
  });

  it('hides students blocked in either direction, like a missing student (FR57)', async () => {
    const me = await createUser();
    const blocker = await createUser({ email: 'blocker@sjsu.edu' });
    const blocked = await createUser({ email: 'blocked@sjsu.edu' });
    await db.block.createMany({
      data: [
        { blockerId: blocker.id, blockedId: me.id },
        { blockerId: me.id, blockedId: blocked.id },
      ],
    });
    const agent = await loggedInAgent(app);

    const missing = await agent.get(`${API_PREFIX}/users/00000000-0000-4000-8000-000000000000`);
    for (const id of [blocker.id, blocked.id]) {
      const res = await agent.get(`${API_PREFIX}/users/${id}`);
      expect(res.status).toBe(404);
      expect(res.body).toEqual(missing.body);
    }
  });

  it('does not show unverified accounts, and treats a malformed id as not found', async () => {
    await createUser();
    const pending = await createUser({ email: 'pending@sjsu.edu', status: 'PENDING_VERIFICATION' });
    const agent = await loggedInAgent(app);

    expect((await agent.get(`${API_PREFIX}/users/${pending.id}`)).status).toBe(404);
    expect((await agent.get(`${API_PREFIX}/users/not-a-uuid`)).status).toBe(404);
  });
});
