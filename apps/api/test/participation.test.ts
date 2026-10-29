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

// Key cases for joining, leaving and removing (FR19, FR21–FR25, FR33–FR34, FR41) and My plans.
// The comprehensive product test cases are the team's separate testing assignment.
// The test clock starts at 2026-10-21 16:00 UTC (9:00 AM on campus); activities start the next day.

let time: ReturnType<typeof createTestClock>;
let app: ReturnType<typeof createApp>;
let organizerId: string;

beforeEach(async () => {
  await resetDb();
  time = createTestClock();
  app = createApp({ mailer: createTestMailer().mailer, clock: time.clock });
  organizerId = (await createUser({ email: 'maya.chen@sjsu.edu', displayName: 'Maya Chen' })).id;
});

afterAll(async () => {
  await db.$disconnect();
});

async function activity({ limit = 3, date = '2026-10-22', title = 'Midterm Study Group' } = {}) {
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

async function student(name: string) {
  const email = `${name.toLowerCase().replace(' ', '.')}@sjsu.edu`;
  const user = await createUser({ email, displayName: name });
  return { id: user.id, agent: await loggedInAgent(app, email) };
}

const organizer = () => loggedInAgent(app, 'maya.chen@sjsu.edu');

async function state(activityId: string) {
  const row = await db.activity.findUniqueOrThrow({ where: { id: activityId } });
  const rows = await db.participation.count({ where: { activityId } });
  return { status: row.status, count: row.participantCount, rows };
}

describe('POST /activities/:id/join (FR21–FR23, FR41)', () => {
  it('adds the student, counts them, and notifies the organizer', async () => {
    const id = await activity();
    const sammy = await student('Sammy Spartan');

    const before = await sammy.agent.get(`${API_PREFIX}/activities/${id}`);
    expect(before.body).toMatchObject({ canJoin: true, joinBlockedReason: null });

    const res = await sammy.agent.post(`${API_PREFIX}/activities/${id}/join`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      viewerRole: 'participant',
      participantCount: 2,
      canJoin: false,
      canLeave: true,
    });
    expect(await state(id)).toEqual({ status: 'OPEN', count: 2, rows: 2 });

    const notes = await db.notification.findMany({ where: { recipientId: organizerId } });
    expect(notes).toMatchObject([
      {
        type: 'PARTICIPANT_JOINED',
        activityId: id,
        actorId: sammy.id,
        body: 'Sammy Spartan joined.',
      },
    ]);
  });

  it('makes the activity Full at the limit, and then says it is full', async () => {
    const id = await activity({ limit: 2 });
    const sammy = await student('Sammy Spartan');
    const alex = await student('Alex Rivera');

    await sammy.agent.post(`${API_PREFIX}/activities/${id}/join`).expect(200);
    expect(await state(id)).toEqual({ status: 'FULL', count: 2, rows: 2 });

    const res = await alex.agent.post(`${API_PREFIX}/activities/${id}/join`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'ACTIVITY_FULL',
      message: 'This activity is full.',
    });
    const detail = await alex.agent.get(`${API_PREFIX}/activities/${id}`);
    expect(detail.body).toMatchObject({
      canJoin: false,
      joinBlockedReason: 'This activity is full.',
    });
  });

  it('admits exactly one of several simultaneous joins for the last spot (FR23)', async () => {
    const id = await activity({ limit: 2 });
    const students = await Promise.all(
      ['Ana Ruiz', 'Ben Cho', 'Cam Diaz', 'Dee Park', 'Eli Nunez'].map(student),
    );

    const results = await Promise.all(
      students.map((s) => s.agent.post(`${API_PREFIX}/activities/${id}/join`)),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409, 409, 409, 409]);
    for (const r of results.filter((r) => r.status === 409)) {
      expect(r.body.error.message).toBe('This activity is full.');
    }
    // The stored count always equals the number of participation rows.
    expect(await state(id)).toEqual({ status: 'FULL', count: 2, rows: 2 });
  });

  it('gives the reason for each other failed condition (FR21)', async () => {
    const id = await activity();
    const sammy = await student('Sammy Spartan');
    const join = () => sammy.agent.post(`${API_PREFIX}/activities/${id}/join`);

    await join().expect(200);
    expect((await join()).body.error.code).toBe('ALREADY_PARTICIPANT');
    expect(
      (await (await organizer()).post(`${API_PREFIX}/activities/${id}/join`)).body.error.code,
    ).toBe('ALREADY_PARTICIPANT');

    const blocked = await student('Alex Rivera');
    await db.block.create({ data: { blockerId: organizerId, blockedId: blocked.id } });
    const res = await blocked.agent.post(`${API_PREFIX}/activities/${id}/join`);
    expect(res.body.error).toMatchObject({ code: 'JOIN_NOT_ALLOWED' });
    expect(res.body.error.message).not.toMatch(/block/i);

    time.advanceHours(32); // Oct 22, 5:00 PM on campus: the activity has started
    const late = await student('Lena Tran');
    expect((await late.agent.post(`${API_PREFIX}/activities/${id}/join`)).body.error.code).toBe(
      'ACTIVITY_STARTED',
    );
  });
});

describe('POST /activities/:id/leave (FR24–FR25, FR41)', () => {
  it('removes the student, reopens a Full activity, notifies the organizer, and allows rejoining', async () => {
    const id = await activity({ limit: 2 });
    const sammy = await student('Sammy Spartan');
    await sammy.agent.post(`${API_PREFIX}/activities/${id}/join`).expect(200);

    const res = await sammy.agent.post(`${API_PREFIX}/activities/${id}/leave`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ viewerRole: 'none', canJoin: true, participantCount: 1 });
    expect(await state(id)).toEqual({ status: 'OPEN', count: 1, rows: 1 });
    const left = await db.notification.findFirst({ where: { type: 'PARTICIPANT_LEFT' } });
    expect(left).toMatchObject({ recipientId: organizerId, actorId: sammy.id });

    await sammy.agent.post(`${API_PREFIX}/activities/${id}/join`).expect(200);
  });

  it('is not available to the organizer, outsiders, or after the start', async () => {
    const id = await activity();
    expect((await (await organizer()).post(`${API_PREFIX}/activities/${id}/leave`)).status).toBe(
      403,
    );

    const sammy = await student('Sammy Spartan');
    expect((await sammy.agent.post(`${API_PREFIX}/activities/${id}/leave`)).status).toBe(404);

    await addParticipants(id, [sammy.id]);
    time.advanceHours(32); // past the start, and past the idle timeout: log in again (FR10)
    const res = await (await loggedInAgent(app)).post(`${API_PREFIX}/activities/${id}/leave`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACTIVITY_STARTED');
    expect(await state(id)).toMatchObject({ count: 2, rows: 2 });
  });
});

describe('DELETE /activities/:id/participants/:userId (FR33–FR34)', () => {
  it('removes the student with a reason, notifies them, and stops them rejoining', async () => {
    const id = await activity({ limit: 2 });
    const sammy = await student('Sammy Spartan');
    await sammy.agent.post(`${API_PREFIX}/activities/${id}/join`).expect(200);

    const res = await (
      await organizer()
    )
      .delete(`${API_PREFIX}/activities/${id}/participants/${sammy.id}`)
      .send({ reason: '  Wrong section  ' });
    expect(res.status).toBe(204);
    expect(await state(id)).toEqual({ status: 'OPEN', count: 1, rows: 1 });

    const note = await db.notification.findFirst({ where: { recipientId: sammy.id } });
    expect(note).toMatchObject({ type: 'REMOVED_FROM_ACTIVITY', body: 'Wrong section' });

    const detail = await sammy.agent.get(`${API_PREFIX}/activities/${id}`);
    expect(detail.body).toMatchObject({ canJoin: false });
    expect(detail.body.joinBlockedReason).toMatch(/removed you/);
    const again = await sammy.agent.post(`${API_PREFIX}/activities/${id}/join`);
    expect(again.body.error.code).toBe('REMOVED_FROM_ACTIVITY');
  });

  it('works without a body, and only for the organizer removing someone else', async () => {
    const id = await activity();
    const sammy = await student('Sammy Spartan');
    const alex = await student('Alex Rivera');
    await addParticipants(id, [sammy.id, alex.id]);

    const byParticipant = await alex.agent.delete(
      `${API_PREFIX}/activities/${id}/participants/${sammy.id}`,
    );
    expect(byParticipant.status).toBe(403);
    const self = await (
      await organizer()
    ).delete(`${API_PREFIX}/activities/${id}/participants/${organizerId}`);
    expect(self.status).toBe(403);

    const res = await (
      await organizer()
    ).delete(`${API_PREFIX}/activities/${id}/participants/${sammy.id}`);
    expect(res.status).toBe(204);
    const note = await db.notification.findFirst({ where: { recipientId: sammy.id } });
    expect(note?.body).toBeNull();
  });
});

describe('GET /activities/:id/participants (FR19)', () => {
  it('lists the organizer first, labeled, then everyone else', async () => {
    const id = await activity({ limit: 4 });
    const sammy = await student('Sammy Spartan');
    await sammy.agent.post(`${API_PREFIX}/activities/${id}/join`).expect(200);

    const res = await sammy.agent.get(`${API_PREFIX}/activities/${id}/participants`);
    expect(res.body).toEqual([
      { userId: organizerId, displayName: 'Maya Chen', isOrganizer: true },
      { userId: sammy.id, displayName: 'Sammy Spartan', isOrganizer: false },
    ]);
  });
});

describe('GET /activities/mine (My plans)', () => {
  it('splits joined and organizing, upcoming and past', async () => {
    const upcoming = await activity({ title: 'Upcoming' });
    const past = await activity({ title: 'Past', date: '2026-10-21' }); // 4–6 PM today
    const sammy = await student('Sammy Spartan');
    await addParticipants(upcoming, [sammy.id]);
    await addParticipants(past, [sammy.id]);
    time.advanceHours(10); // Oct 21, 7:00 PM on campus: "Past" has ended
    const agent = await loggedInAgent(app); // the old session timed out (FR10)

    const titles = async (agent: Awaited<ReturnType<typeof organizer>>, query: string) =>
      (
        (await agent.get(`${API_PREFIX}/activities/mine?${query}`)).body.items as {
          title: string;
        }[]
      ).map((item) => item.title);

    expect(await titles(agent, 'role=joined&when=upcoming')).toEqual(['Upcoming']);
    expect(await titles(agent, 'role=joined&when=past')).toEqual(['Past']);
    expect(await titles(agent, 'role=organizing&when=upcoming')).toEqual([]);
    expect(await titles(await organizer(), 'role=organizing&when=upcoming')).toEqual(['Upcoming']);
  });
});
