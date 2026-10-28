import request from 'supertest';
import type { EmailMessage, Mailer } from '../src/common/email.js';
import type { Clock } from '../src/common/time.js';
import { hashPassword } from '../src/common/password.js';
import { db } from '../src/db.js';

/** Empties every application table (keeps Prisma's migration history). */
export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

/** Records emails instead of sending them. */
export function createTestMailer() {
  const sent: EmailMessage[] = [];
  const mailer: Mailer = {
    async send(message) {
      sent.push(message);
    },
  };
  return { mailer, sent };
}

/** A clock that only moves when told to. */
export function createTestClock(start = new Date('2026-10-21T16:00:00Z')) {
  let current = start.getTime();
  const clock: Clock = { now: () => new Date(current) };
  return {
    clock,
    advanceHours(hours: number) {
      current += hours * 60 * 60 * 1000;
    },
    advanceMinutes(minutes: number) {
      current += minutes * 60 * 1000;
    },
  };
}

/** Pulls the token out of the verification link in an email. */
export function tokenFromEmail(message: EmailMessage | undefined): string {
  const match = message?.text.match(/verify-email\?token=([\w%-]+)/);
  if (!match?.[1]) throw new Error('No verification link found in the email');
  return decodeURIComponent(match[1]);
}

/** Inserts a student directly (bypassing registration). Active unless told otherwise. */
export async function createUser({
  email = 'sammy.spartan@sjsu.edu',
  password = 'goSpartans1',
  displayName = 'Sammy Spartan',
  status = 'ACTIVE' as 'ACTIVE' | 'PENDING_VERIFICATION',
  interests = ['STUDY'] as ('STUDY' | 'SPORTS' | 'FOOD' | 'SOCIAL' | 'GAMING')[],
} = {}) {
  return db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      displayName,
      interests,
      status,
      availability: { create: [{ dayOfWeek: 3, startMinute: 960, endMinute: 1080 }] },
    },
  });
}

/** A Supertest agent logged in as the given student (cookie kept between requests). */
export async function loggedInAgent(
  app: Parameters<typeof request.agent>[0],
  email = 'sammy.spartan@sjsu.edu',
  password = 'goSpartans1',
) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200)
    throw new Error(`Test login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}
