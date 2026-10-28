import { API_PREFIX } from '@sh/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';
import { createTestClock, createTestMailer, createUser, resetDb } from './helpers.js';

// Key cases for login, sessions and lockout (FR09–FR11).
// The comprehensive product test cases are the team's separate testing assignment.

const EMAIL = 'sammy.spartan@sjsu.edu';
const PASSWORD = 'goSpartans1';

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

const login = (agent: ReturnType<typeof request.agent>, email = EMAIL, password = PASSWORD) =>
  agent.post(`${API_PREFIX}/auth/login`).send({ email, password });

describe('POST /auth/login (FR09)', () => {
  it('starts a session in an HttpOnly cookie for a verified student', async () => {
    const user = await createUser();
    const agent = request.agent(app);

    const res = await login(agent, 'Sammy.Spartan@SJSU.edu');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: user.id, displayName: 'Sammy Spartan', role: 'STUDENT' });
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/^sh_sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    expect((await agent.get(`${API_PREFIX}/auth/me`)).body.id).toBe(user.id);
    // Only the token's hash is stored.
    const session = await db.session.findFirstOrThrow();
    expect(cookie).not.toContain(session.tokenHash);
  });

  it('gives the same answer for an unknown email and a wrong password', async () => {
    await createUser();
    const unknown = await login(request.agent(app), 'nobody@sjsu.edu');
    const wrong = await login(request.agent(app), EMAIL, 'wrongPassword1');

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('refuses unverified accounts, but only after a correct password', async () => {
    await createUser({ status: 'PENDING_VERIFICATION' });

    const wrong = await login(request.agent(app), EMAIL, 'wrongPassword1');
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');

    const right = await login(request.agent(app));
    expect(right.status).toBe(403);
    expect(right.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(await db.session.count()).toBe(0);
  });
});

describe('lockout (FR11)', () => {
  it('locks after five failures, refuses even the right password, and unlocks after 15 minutes', async () => {
    await createUser();
    const agent = request.agent(app);
    for (let i = 0; i < 4; i++) {
      expect((await login(agent, EMAIL, 'wrongPassword1')).status).toBe(401);
    }
    const fifth = await login(agent, EMAIL, 'wrongPassword1');
    expect(fifth.status).toBe(423);
    expect(fifth.body.error.code).toBe('ACCOUNT_LOCKED');

    time.advanceMinutes(14);
    expect((await login(agent)).status).toBe(423);

    time.advanceMinutes(1);
    expect((await login(agent)).status).toBe(200);
  });

  it('resets the count after a successful login', async () => {
    await createUser();
    const agent = request.agent(app);
    for (let i = 0; i < 4; i++) await login(agent, EMAIL, 'wrongPassword1');
    expect((await login(agent)).status).toBe(200);
    for (let i = 0; i < 4; i++) await login(agent, EMAIL, 'wrongPassword1');

    expect((await login(agent)).status).toBe(200);
  });
});

describe('sessions (FR10)', () => {
  it('ends after 30 minutes without activity', async () => {
    await createUser();
    const agent = request.agent(app);
    await login(agent);

    time.advanceMinutes(30);
    const res = await agent.get(`${API_PREFIX}/auth/me`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(await db.session.count()).toBe(0);
  });

  it('stays active while the student keeps using it', async () => {
    await createUser();
    const agent = request.agent(app);
    await login(agent);

    for (let i = 0; i < 3; i++) {
      time.advanceMinutes(20); // 60 minutes in total, never 30 idle
      expect((await agent.get(`${API_PREFIX}/auth/me`)).status).toBe(200);
    }
  });

  it('ends on Log Out', async () => {
    await createUser();
    const agent = request.agent(app);
    await login(agent);

    expect((await agent.post(`${API_PREFIX}/auth/logout`)).status).toBe(204);
    expect((await agent.get(`${API_PREFIX}/auth/me`)).status).toBe(401);
    expect(await db.session.count()).toBe(0);
  });
});

describe('CSRF origin check', () => {
  it('rejects writes that a browser marks as coming from another site', async () => {
    await createUser();
    const res = await request(app)
      .post(`${API_PREFIX}/auth/login`)
      .set('Origin', 'https://evil.example')
      .send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(await db.session.count()).toBe(0);
  });
});
