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

// Key cases for cancellation (FR31–FR32), who receives each notification (FR40–FR41), the
// notification list (FR42) and background polling vs the idle timeout (FR10, Q27).
// The comprehensive product test cases are the team's separate testing assignment.
// The test clock starts at Wednesday 2026-10-21, 9:00 AM on campus (createUser's viewer is free
// on Wednesdays 4–6 PM and likes Study).

let time: ReturnType<typeof createTestClock>;
let app: ReturnType<typeof createApp>;
let organizerId: string;
let activityId: string;
let sammyId: string;
let alexId: string;

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
});

afterAll(async () => {
  await db.$disconnect();
});

const organizer = () => loggedInAgent(app, 'maya.chen@sjsu.edu');
const sammy = () => loggedInAgent(app);
const alex = () => loggedInAgent(app, 'alex.rivera@sjsu.edu');

/** The types a student received, sorted (several can share a timestamp). */
async function received(userId: string) {
  const rows = await db.notification.findMany({ where: { recipientId: userId } });
  return rows.map((row) => row.type).sort();
}

describe('POST /activities/:id/cancel (FR31–FR32, FR40b)', () => {
  it('cancels for good with a reason and notifies every other participant', async () => {
    await addParticipants(activityId, [sammyId, alexId]);

    const res = await (
      await organizer()
    )
      .post(`${API_PREFIX}/activities/${activityId}/cancel`)
      .send({ reason: 'Library closed' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'CANCELLED',
      cancellationReason: 'Library closed',
      canEdit: false,
      canCancel: false,
    });

    for (const id of [sammyId, alexId]) {
      const note = await db.notification.findFirst({ where: { recipientId: id } });
      expect(note).toMatchObject({ type: 'ACTIVITY_CANCELLED', body: 'Library closed' });
    }
    expect(await received(organizerId)).toEqual([]);

    // Irreversible: it can't be cancelled again or edited.
    const again = await (await organizer()).post(`${API_PREFIX}/activities/${activityId}/cancel`);
    expect(again.body.error.code).toBe('ACTIVITY_NOT_OPEN');
    const edit = await (
      await organizer()
    )
      .patch(`${API_PREFIX}/activities/${activityId}`)
      .send({ title: 'Back on' });
    expect(edit.body.error.code).toBe('ACTIVITY_NOT_OPEN');
  });

  it('is only for the organizer, and only before the start', async () => {
    await addParticipants(activityId, [sammyId]);
    const res = await (await sammy()).post(`${API_PREFIX}/activities/${activityId}/cancel`);
    expect(res.status).toBe(403);

    time.advanceHours(8); // 5:00 PM on campus: started
    const late = await (await organizer()).post(`${API_PREFIX}/activities/${activityId}/cancel`);
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('ACTIVITY_STARTED');
  });

  it('hides a cancelled activity from lists and from students outside it (FR20, FR32)', async () => {
    await addParticipants(activityId, [alexId]);
    expect((await (await sammy()).get(`${API_PREFIX}/activities`)).body.items).toHaveLength(1);
    await (await organizer()).post(`${API_PREFIX}/activities/${activityId}/cancel`).expect(200);

    const outsider = await sammy();
    expect((await outsider.get(`${API_PREFIX}/activities`)).body.items).toEqual([]);
    expect((await outsider.get(`${API_PREFIX}/activities/recommended`)).body.items).toEqual([]);
    expect((await outsider.get(`${API_PREFIX}/activities/${activityId}`)).status).toBe(404);
    expect((await outsider.post(`${API_PREFIX}/activities/${activityId}/join`)).status).toBe(404);

    const member = await alex();
    const detail = await member.get(`${API_PREFIX}/activities/${activityId}`);
    expect(detail.body).toMatchObject({ status: 'CANCELLED', canLeave: false });
    const plans = await member.get(`${API_PREFIX}/activities/mine?role=joined&when=past`);
    expect(plans.body.items).toHaveLength(1);
  });
});

describe('who is notified (FR40–FR41)', () => {
  it('edit → other participants; join/leave → organizer; removal → the removed student', async () => {
    const s = await sammy();
    await s.post(`${API_PREFIX}/activities/${activityId}/join`).expect(200);
    const a = await alex();
    await a.post(`${API_PREFIX}/activities/${activityId}/join`).expect(200);
    await a.post(`${API_PREFIX}/activities/${activityId}/leave`).expect(200);

    const o = await organizer();
    await o
      .patch(`${API_PREFIX}/activities/${activityId}`)
      .send({ location: 'MLK 225' })
      .expect(200);
    await o.delete(`${API_PREFIX}/activities/${activityId}/participants/${sammyId}`).expect(204);

    expect(await received(organizerId)).toEqual([
      'PARTICIPANT_JOINED',
      'PARTICIPANT_JOINED',
      'PARTICIPANT_LEFT',
    ]);
    expect(await received(sammyId)).toEqual(['ACTIVITY_CHANGED', 'REMOVED_FROM_ACTIVITY']);
    // Alex had left before the edit.
    expect(await received(alexId)).toEqual([]);
  });
});

describe('/notifications (FR42)', () => {
  beforeEach(async () => {
    const s = await sammy();
    await s.post(`${API_PREFIX}/activities/${activityId}/join`).expect(200);
    // created_at comes from the database clock; make the join clearly the older one.
    await db.notification.updateMany({ data: { createdAt: new Date('2026-10-21T15:00:00Z') } });
    await s.post(`${API_PREFIX}/activities/${activityId}/leave`).expect(200);
  });

  it('lists the student’s own notifications newest first, with an unread count', async () => {
    const o = await organizer();
    const list = await o.get(`${API_PREFIX}/notifications`);
    expect(list.status).toBe(200);
    expect(list.body).toMatchObject({ page: 1, hasMore: false });
    expect(list.body.items).toMatchObject([
      {
        type: 'PARTICIPANT_LEFT',
        activityId,
        activityTitle: 'Midterm Study Group',
        body: 'Sammy Spartan left.',
        conversationUserId: null,
        read: false,
      },
      { type: 'PARTICIPANT_JOINED', body: 'Sammy Spartan joined.' },
    ]);
    expect((await o.get(`${API_PREFIX}/notifications/unread-count`)).body).toEqual({ count: 2 });
    expect((await (await sammy()).get(`${API_PREFIX}/notifications`)).body.items).toEqual([]);
  });

  it('marks one read when opened; other students get 404', async () => {
    const o = await organizer();
    const [latest] = (await o.get(`${API_PREFIX}/notifications`)).body.items;

    expect(
      (await (await sammy()).post(`${API_PREFIX}/notifications/${latest.id}/read`)).status,
    ).toBe(404);
    expect((await o.post(`${API_PREFIX}/notifications/not-an-id/read`)).status).toBe(404);

    await o.post(`${API_PREFIX}/notifications/${latest.id}/read`).expect(204);
    expect((await o.get(`${API_PREFIX}/notifications/unread-count`)).body).toEqual({ count: 1 });
    expect((await o.get(`${API_PREFIX}/notifications`)).body.items[0].read).toBe(true);
  });

  it('keeps the title snapshot after the activity is renamed', async () => {
    await (
      await organizer()
    )
      .patch(`${API_PREFIX}/activities/${activityId}`)
      .send({ title: 'Final Study Group' })
      .expect(200);
    const items = (await (await organizer()).get(`${API_PREFIX}/notifications`)).body.items;
    expect(items[0].activityTitle).toBe('Midterm Study Group');
  });
});

describe('background polling and the idle timeout (FR10, Q27)', () => {
  it('a polled request does not keep the session alive', async () => {
    const agent = await sammy();
    time.advanceMinutes(20);
    await agent
      .get(`${API_PREFIX}/notifications/unread-count`)
      .set('X-Background-Refresh', '1')
      .expect(200);
    time.advanceMinutes(15); // 35 minutes after the last real request
    expect((await agent.get(`${API_PREFIX}/auth/me`)).status).toBe(401);
  });

  it('a normal request does', async () => {
    const agent = await sammy();
    time.advanceMinutes(20);
    await agent.get(`${API_PREFIX}/notifications/unread-count`).expect(200);
    time.advanceMinutes(15);
    expect((await agent.get(`${API_PREFIX}/auth/me`)).status).toBe(200);
  });
});
