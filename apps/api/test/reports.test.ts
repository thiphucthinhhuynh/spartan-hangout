import { API_PREFIX, campusDateTimeToUtc } from '@sh/shared';
import request from 'supertest';
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

// Key cases for reports and administrator review (FR50–FR53).
// The comprehensive product test cases are the team's separate testing assignment.

let app: ReturnType<typeof createApp>;
let sammyId: string;
let anaId: string;
let adminId: string;
let activityId: string;

beforeEach(async () => {
  await resetDb();
  app = createApp({ mailer: createTestMailer().mailer, clock: createTestClock().clock });
  sammyId = (await createUser()).id;
  anaId = (await createUser({ email: 'ana.ruiz@sjsu.edu', displayName: 'Ana Ruiz' })).id;
  adminId = (await createUser({ email: 'admin@sjsu.edu', displayName: 'Admin' })).id;
  await db.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });
  const activity = await db.activity.create({
    data: {
      title: 'Midterm Study Group',
      description: 'Bring your notes.',
      type: 'STUDY',
      startAt: campusDateTimeToUtc('2026-10-22', '16:00'),
      endAt: campusDateTimeToUtc('2026-10-22', '18:00'),
      location: 'King Library',
      participantLimit: 8,
      organizerId: anaId,
      participations: { create: { userId: anaId, isOrganizer: true } },
    },
  });
  activityId = activity.id;
});

afterAll(async () => {
  await db.$disconnect();
});

const sammy = () => loggedInAgent(app);
const ana = () => loggedInAgent(app, 'ana.ruiz@sjsu.edu');
const admin = () => loggedInAgent(app, 'admin@sjsu.edu');
const reports = `${API_PREFIX}/reports`;

describe('POST /reports (FR50–FR52)', () => {
  it('stores a Pending report, confirms it, and notifies nobody', async () => {
    const res = await (
      await sammy()
    )
      .post(reports)
      .send({ targetUserId: anaId, reason: 'HARASSMENT', description: '  Rude in chat  ' });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/submitted/);

    expect(await db.report.findMany()).toMatchObject([
      {
        reporterId: sammyId,
        targetUserId: anaId,
        targetActivityId: null,
        reason: 'HARASSMENT',
        description: 'Rude in chat',
        status: 'PENDING',
        createdAt: new Date('2026-10-21T16:00:00Z'),
      },
    ]);
    expect(await db.notification.count()).toBe(0);
  });

  it('reports an activity; canReport is off for its organizer only', async () => {
    const s = await sammy();
    expect((await s.get(`${API_PREFIX}/activities/${activityId}`)).body.canReport).toBe(true);
    const own = await (await ana()).get(`${API_PREFIX}/activities/${activityId}`);
    expect(own.body.canReport).toBe(false);

    await s.post(reports).send({ targetActivityId: activityId, reason: 'SPAM' }).expect(201);
    expect(await db.report.count({ where: { targetActivityId: activityId } })).toBe(1);
  });

  it('refuses your own profile or activity, and what you can’t see', async () => {
    const a = await ana();
    expect((await a.post(reports).send({ targetUserId: anaId, reason: 'SPAM' })).status).toBe(403);
    const own = await a.post(reports).send({ targetActivityId: activityId, reason: 'SPAM' });
    expect(own.status).toBe(403);

    const s = await sammy();
    const missing = { targetUserId: '00000000-0000-4000-8000-000000000000', reason: 'SPAM' };
    expect((await s.post(reports).send(missing)).status).toBe(404);

    await db.block.create({ data: { blockerId: anaId, blockedId: sammyId } });
    expect((await s.post(reports).send({ targetUserId: anaId, reason: 'SPAM' })).status).toBe(404);

    await db.activity.update({ where: { id: activityId }, data: { status: 'CANCELLED' } });
    const hidden = await s.post(reports).send({ targetActivityId: activityId, reason: 'SPAM' });
    expect(hidden.status).toBe(404);
    expect(await db.report.count()).toBe(0);
  });

  it('a participant can report a cancelled activity they were in', async () => {
    await addParticipants(activityId, [sammyId]);
    await db.activity.update({ where: { id: activityId }, data: { status: 'CANCELLED' } });
    await (
      await sammy()
    )
      .post(reports)
      .send({ targetActivityId: activityId, reason: 'OTHER' })
      .expect(201);
  });

  it('needs a reason and exactly one target', async () => {
    const s = await sammy();
    const noReason = await s.post(reports).send({ targetUserId: anaId });
    expect(noReason.status).toBe(422);
    expect(noReason.body.error.fields.reason).toBeDefined();
    expect((await s.post(reports).send({ reason: 'SPAM' })).status).toBe(422);
  });

  it('rejects a second report while one is Pending, and allows one after review (FR51)', async () => {
    const s = await sammy();
    const report = { targetUserId: anaId, reason: 'SPAM' };
    await s.post(reports).send(report).expect(201);

    const again = await s.post(reports).send({ ...report, reason: 'OTHER' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('DUPLICATE_PENDING_REPORT');

    const [pending] = await db.report.findMany();
    await (await admin()).post(`${API_PREFIX}/admin/reports/${pending?.id}/review`).expect(200);
    await s.post(reports).send(report).expect(201);
  });

  it('keeps one report when two identical ones arrive at once', async () => {
    const s = await sammy();
    const report = { targetActivityId: activityId, reason: 'SPAM' };
    const results = await Promise.all([s.post(reports).send(report), s.post(reports).send(report)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.report.count()).toBe(1);
  });
});

describe('/admin/reports (FR53)', () => {
  beforeEach(async () => {
    const s = await sammy();
    await s.post(reports).send({ targetUserId: anaId, reason: 'HARASSMENT' }).expect(201);
    await s.post(reports).send({ targetActivityId: activityId, reason: 'SPAM' }).expect(201);
  });

  it('is closed to students and to anyone not logged in', async () => {
    const [report] = await db.report.findMany();
    const s = await sammy();
    expect((await s.get(`${API_PREFIX}/admin/reports`)).status).toBe(403);
    expect((await s.post(`${API_PREFIX}/admin/reports/${report?.id}/review`)).status).toBe(403);
    expect((await request(app).get(`${API_PREFIX}/admin/reports`)).status).toBe(401);
    expect(await db.report.count({ where: { status: 'REVIEWED' } })).toBe(0);
  });

  it('lists every report with its details and no email', async () => {
    const res = await (await admin()).get(`${API_PREFIX}/admin/reports`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reporter: { id: sammyId, displayName: 'Sammy Spartan' },
          targetUser: { id: anaId, displayName: 'Ana Ruiz' },
          targetActivity: null,
          reason: 'HARASSMENT',
          status: 'PENDING',
          reviewedBy: null,
          reviewedAt: null,
        }),
        expect.objectContaining({
          targetUser: null,
          targetActivity: { id: activityId, title: 'Midterm Study Group', status: 'OPEN' },
        }),
      ]),
    );
    expect(JSON.stringify(res.body)).not.toContain('@sjsu.edu');
  });

  it('marks a report Reviewed once, recording who and when, and filters by status', async () => {
    const a = await admin();
    const [report] = await db.report.findMany({ where: { targetUserId: anaId } });
    const res = await a.post(`${API_PREFIX}/admin/reports/${report?.id}/review`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'REVIEWED',
      reviewedBy: { id: adminId, displayName: 'Admin' },
      reviewedAt: '2026-10-21T16:00:00.000Z',
    });

    const again = await a.post(`${API_PREFIX}/admin/reports/${report?.id}/review`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('REPORT_ALREADY_REVIEWED');

    const pending = await a.get(`${API_PREFIX}/admin/reports?status=PENDING`);
    expect(pending.body.items).toHaveLength(1);
    expect(pending.body.items[0].targetActivity.id).toBe(activityId);
    const reviewed = await a.get(`${API_PREFIX}/admin/reports?status=REVIEWED`);
    expect(reviewed.body.items).toHaveLength(1);

    const missing = '00000000-0000-4000-8000-000000000000';
    expect((await a.post(`${API_PREFIX}/admin/reports/${missing}/review`)).status).toBe(404);
    expect((await a.post(`${API_PREFIX}/admin/reports/nope/review`)).status).toBe(404);
  });
});

describe('administrators are not students (Q14)', () => {
  it('leaves them out of Discover students', async () => {
    await db.user.update({ where: { id: adminId }, data: { interests: ['STUDY'] } });
    const res = await (await sammy()).get(`${API_PREFIX}/connections/discover`);
    expect(res.body.items.map((s: { id: string }) => s.id)).toEqual([anaId]);
  });
});
