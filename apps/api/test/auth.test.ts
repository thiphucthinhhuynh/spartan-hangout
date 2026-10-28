import { API_PREFIX } from '@sh/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';
import { createTestClock, createTestMailer, resetDb, tokenFromEmail } from './helpers.js';

// Key cases for registration and email verification (FR01–FR04).
// The comprehensive product test cases are the team's separate testing assignment.

const registration = {
  email: 'Sammy.Spartan@sjsu.edu',
  password: 'goSpartans1',
  displayName: 'Sammy Spartan',
  interests: ['STUDY', 'SPORTS'],
  availability: [{ dayOfWeek: 3, start: '16:00', end: '18:00' }],
};

let mail: ReturnType<typeof createTestMailer>;
let time: ReturnType<typeof createTestClock>;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  await resetDb();
  mail = createTestMailer();
  time = createTestClock();
  app = createApp({ mailer: mail.mailer, clock: time.clock });
});

afterAll(async () => {
  await db.$disconnect();
});

const register = (body: object = registration) =>
  request(app).post(`${API_PREFIX}/auth/register`).send(body);
const verify = (token: string) =>
  request(app).post(`${API_PREFIX}/auth/verify-email`).send({ token });
const resend = (email: string) =>
  request(app).post(`${API_PREFIX}/auth/resend-verification`).send({ email });

describe('POST /auth/register', () => {
  it('creates an inactive account with the profile data and emails a link (FR02–FR03)', async () => {
    const res = await register();
    expect(res.status).toBe(201);

    const user = await db.user.findUniqueOrThrow({
      where: { email: 'sammy.spartan@sjsu.edu' },
      include: { availability: true },
    });
    expect(user.status).toBe('PENDING_VERIFICATION');
    expect(user.passwordHash).not.toContain('goSpartans1');
    expect(user.interests).toEqual(['STUDY', 'SPORTS']);
    expect(user.availability).toMatchObject([{ dayOfWeek: 3, startMinute: 960, endMinute: 1080 }]);

    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]?.to).toBe('sammy.spartan@sjsu.edu');
    // Only the hash of the emailed token is stored.
    const stored = await db.emailVerificationToken.findFirstOrThrow();
    expect(stored.tokenHash).not.toBe(tokenFromEmail(mail.sent[0]));
  });

  it('rejects non-SJSU emails with the reason (FR01)', async () => {
    const res = await register({ ...registration, email: 'sammy@gmail.com' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.fields.email).toMatch(/@sjsu\.edu/);
    expect(await db.user.count()).toBe(0);
  });

  it('rejects an email already linked to an account, ignoring case (FR01)', async () => {
    await register();
    const res = await register({ ...registration, email: 'SAMMY.SPARTAN@sjsu.edu' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(await db.user.count()).toBe(1);
  });

  it('identifies each invalid field and saves nothing (FR02)', async () => {
    const res = await register({
      email: 'sammy@sjsu.edu',
      password: 'short',
      displayName: '',
      interests: [],
      availability: [{ dayOfWeek: 1, start: '12:00', end: '11:00' }],
    });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'availability.0.end',
      'displayName',
      'interests',
      'password',
    ]);
    expect(await db.user.count()).toBe(0);
  });
});

describe('POST /auth/verify-email', () => {
  it('activates the account with a valid link, once (FR03–FR04)', async () => {
    await register();
    const token = tokenFromEmail(mail.sent[0]);

    const res = await verify(token);
    expect(res.status).toBe(200);
    const user = await db.user.findUniqueOrThrow({ where: { email: 'sammy.spartan@sjsu.edu' } });
    expect(user.status).toBe('ACTIVE');

    const again = await verify(token);
    expect(again.status).toBe(404);
  });

  it('rejects a link older than 24 hours (FR03)', async () => {
    await register();
    time.advanceHours(24);

    const res = await verify(tokenFromEmail(mail.sent[0]));
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects an unknown token', async () => {
    const res = await verify('not-a-real-token');
    expect(res.status).toBe(404);
  });
});

describe('POST /auth/resend-verification', () => {
  it('sends a new link that works, and the old link stops working (FR03)', async () => {
    await register();
    const oldToken = tokenFromEmail(mail.sent[0]);
    time.advanceHours(25);

    const res = await resend('sammy.spartan@sjsu.edu');
    expect(res.status).toBe(202);
    expect(mail.sent).toHaveLength(2);

    expect((await verify(oldToken)).status).toBe(404);
    expect((await verify(tokenFromEmail(mail.sent[1]))).status).toBe(200);
  });

  it('gives the same answer for unknown or already-verified emails, without sending', async () => {
    const unknown = await resend('nobody@sjsu.edu');
    await register();
    await verify(tokenFromEmail(mail.sent[0]));
    const verified = await resend('sammy.spartan@sjsu.edu');

    expect(unknown.status).toBe(202);
    expect(verified.status).toBe(202);
    expect(mail.sent).toHaveLength(1);
  });
});
