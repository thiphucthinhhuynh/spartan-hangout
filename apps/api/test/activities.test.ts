import { API_PREFIX } from '@sh/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';
import { completeEndedActivities } from '../src/modules/activities/activities.repository.js';
import {
  addParticipants,
  createTestClock,
  createTestMailer,
  createUser,
  loggedInAgent,
  resetDb,
} from './helpers.js';

// Key cases for activities (FR18, FR20, FR26–FR30, FR40a).
// The comprehensive product test cases are the team's separate testing assignment.
// The test clock starts at 2026-10-21 16:00 UTC (9:00 AM on campus).

const activity = {
  title: 'Midterm Study Group',
  description: 'Focused study blocks and a break together.',
  type: 'STUDY',
  date: '2026-10-22',
  startTime: '16:00',
  endTime: '18:00',
  location: 'King Library',
  participantLimit: 8,
};

let time: ReturnType<typeof createTestClock>;
let app: ReturnType<typeof createApp>;
let organizerId: string;

beforeEach(async () => {
  await resetDb();
  time = createTestClock();
  app = createApp({ mailer: createTestMailer().mailer, clock: time.clock });
  organizerId = (await createUser({ displayName: 'Maya Chen' })).id;
});

afterAll(async () => {
  await db.$disconnect();
});

const organizer = () => loggedInAgent(app);
async function createActivity(overrides: object = {}) {
  const res = await (
    await organizer()
  )
    .post(`${API_PREFIX}/activities`)
    .send({ ...activity, ...overrides });
  if (res.status !== 201) throw new Error(`create failed: ${JSON.stringify(res.body)}`);
  return res.body as { id: string };
}
async function student(email: string) {
  const user = await createUser({ email, displayName: email.split('@')[0] });
  return { id: user.id, agent: await loggedInAgent(app, email) };
}

describe('POST /activities (FR26–FR28)', () => {
  it('creates an Open activity with the organizer as its first participant', async () => {
    const res = await (await organizer()).post(`${API_PREFIX}/activities`).send(activity);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Midterm Study Group',
      status: 'OPEN',
      participantCount: 1,
      participantLimit: 8,
      openSpots: 7,
      viewerRole: 'organizer',
      canEdit: true,
      organizer: { id: organizerId, displayName: 'Maya Chen' },
      // 4:00 PM on campus in October (UTC-7)
      startAt: '2026-10-22T23:00:00.000Z',
      endAt: '2026-10-23T01:00:00.000Z',
    });

    const rows = await db.participation.findMany({ where: { activityId: res.body.id } });
    expect(rows).toMatchObject([{ userId: organizerId, isOrganizer: true }]);
  });

  it('identifies each invalid field and saves nothing (FR27)', async () => {
    const res = await (
      await organizer()
    )
      .post(`${API_PREFIX}/activities`)
      .send({ ...activity, title: '', endTime: '15:00', participantLimit: 1 });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'endTime',
      'participantLimit',
      'title',
    ]);
    expect(await db.activity.count()).toBe(0);
  });

  it('rejects a start time in the past (FR27)', async () => {
    // 8:00 AM on campus today is before the clock's 9:00 AM.
    const res = await (
      await organizer()
    )
      .post(`${API_PREFIX}/activities`)
      .send({ ...activity, date: '2026-10-21', startTime: '08:00', endTime: '10:00' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.startTime).toMatch(/future/);
  });
});

describe('GET /activities/:id (FR18, FR20)', () => {
  it('shows every FR18 field to another student, without edit rights', async () => {
    const { id } = await createActivity();
    const { agent } = await student('alex.rivera@sjsu.edu');

    const res = await agent.get(`${API_PREFIX}/activities/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: activity.title,
      description: activity.description,
      type: 'STUDY',
      location: 'King Library',
      organizer: { displayName: 'Maya Chen' },
      participantLimit: 8,
      participantCount: 1,
      status: 'OPEN',
      viewerRole: 'none',
      canEdit: false,
    });
  });

  it('becomes Completed after the end time, visible only to its members', async () => {
    const { id } = await createActivity();
    await createUser({ email: 'alex.rivera@sjsu.edu' });
    time.advanceHours(34); // past 6:00 PM on Oct 22 (campus time)

    const member = await (await organizer()).get(`${API_PREFIX}/activities/${id}`);
    expect(member.body.status).toBe('COMPLETED');
    expect(member.body.canEdit).toBe(false);

    const outsider = await (
      await loggedInAgent(app, 'alex.rivera@sjsu.edu')
    ).get(`${API_PREFIX}/activities/${id}`);
    expect(outsider.status).toBe(404);

    expect(await completeEndedActivities(db, time.clock.now())).toBe(1);
    expect((await db.activity.findUniqueOrThrow({ where: { id } })).status).toBe('COMPLETED');
  });

  it('treats unknown and malformed ids as not found', async () => {
    const agent = await organizer();
    expect((await agent.get(`${API_PREFIX}/activities/not-an-id`)).status).toBe(404);
    expect(
      (await agent.get(`${API_PREFIX}/activities/00000000-0000-4000-8000-000000000000`)).status,
    ).toBe(404);
  });
});

describe('PATCH /activities/:id (FR29–FR30, FR40a)', () => {
  it('lets only the organizer edit', async () => {
    const { id } = await createActivity();
    const alex = await student('alex.rivera@sjsu.edu');
    await addParticipants(id, [alex.id]);

    const res = await alex.agent
      .patch(`${API_PREFIX}/activities/${id}`)
      .send({ title: 'Mine now' });
    expect(res.status).toBe(403);
  });

  it('notifies the other participants when the location changes, but not the description', async () => {
    const { id } = await createActivity();
    const alex = await student('alex.rivera@sjsu.edu');
    const jordan = await student('jordan.lee@sjsu.edu');
    await addParticipants(id, [alex.id, jordan.id]);
    const agent = await organizer();

    const moved = await agent
      .patch(`${API_PREFIX}/activities/${id}`)
      .send({ location: 'Student Union', description: 'New plan.' });
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({ location: 'Student Union', description: 'New plan.' });

    const notifications = await db.notification.findMany({ orderBy: { recipientId: 'asc' } });
    expect(notifications.map((n) => n.recipientId).sort()).toEqual([alex.id, jordan.id].sort());
    expect(notifications[0]).toMatchObject({
      type: 'ACTIVITY_CHANGED',
      activityId: id,
      activityTitle: 'Midterm Study Group',
      actorId: organizerId,
      body: 'Changed: location.',
    });

    await agent.patch(`${API_PREFIX}/activities/${id}`).send({ description: 'Another plan.' });
    expect(await db.notification.count()).toBe(2);
  });

  it('never lowers the limit below the participant count, and recomputes Full/Open', async () => {
    const { id } = await createActivity();
    const alex = await student('alex.rivera@sjsu.edu');
    const jordan = await student('jordan.lee@sjsu.edu');
    await addParticipants(id, [alex.id, jordan.id]); // 3 going, including the organizer
    const agent = await organizer();

    const tooLow = await agent
      .patch(`${API_PREFIX}/activities/${id}`)
      .send({ participantLimit: 2 });
    expect(tooLow.status).toBe(409);
    expect(tooLow.body.error.code).toBe('LIMIT_BELOW_COUNT');
    expect(tooLow.body.error.fields.participantLimit).toBeDefined();

    const full = await agent.patch(`${API_PREFIX}/activities/${id}`).send({ participantLimit: 3 });
    expect(full.body).toMatchObject({ status: 'FULL', openSpots: 0 });

    const open = await agent.patch(`${API_PREFIX}/activities/${id}`).send({ participantLimit: 5 });
    expect(open.body).toMatchObject({ status: 'OPEN', openSpots: 2 });
  });

  it('validates the merged result with the creation rules (FR30)', async () => {
    const { id } = await createActivity();
    // Only the start time changes, to after the existing 6:00 PM end time.
    const res = await (
      await organizer()
    )
      .patch(`${API_PREFIX}/activities/${id}`)
      .send({ startTime: '19:00' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.endTime).toMatch(/later/);
  });

  it('refuses edits once the activity has started (FR29)', async () => {
    const { id } = await createActivity();
    time.advanceHours(31); // 4:00 PM on Oct 22, campus time

    const res = await (
      await organizer()
    )
      .patch(`${API_PREFIX}/activities/${id}`)
      .send({ title: 'Too late' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACTIVITY_STARTED');
  });
});
