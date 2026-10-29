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

// Key cases for finding activities (FR14–FR17).
// The comprehensive product test cases are the team's separate testing assignment.
// The test clock starts at Wednesday 2026-10-21, 9:00 AM on campus. The viewer (createUser's
// defaults) is interested in Study and free on Wednesdays from 4:00 to 6:00 PM.

type ActivityType = 'STUDY' | 'SPORTS' | 'FOOD' | 'SOCIAL' | 'GAMING';

let time: ReturnType<typeof createTestClock>;
let app: ReturnType<typeof createApp>;
let viewerId: string;
let organizerId: string;

beforeEach(async () => {
  await resetDb();
  time = createTestClock();
  app = createApp({ mailer: createTestMailer().mailer, clock: time.clock });
  viewerId = (await createUser()).id;
  organizerId = (await createUser({ email: 'maya.chen@sjsu.edu', displayName: 'Maya Chen' })).id;
});

afterAll(async () => {
  await db.$disconnect();
});

/** Inserts an activity directly, organized by Maya unless told otherwise. */
async function activity({
  title = 'Midterm Study Group',
  type = 'STUDY' as ActivityType,
  date = '2026-10-21',
  start = '16:00',
  end = '18:00',
  location = 'King Library',
  limit = 8,
  status = 'OPEN' as 'OPEN' | 'FULL',
  organizer = organizerId,
} = {}) {
  const row = await db.activity.create({
    data: {
      title,
      description: 'Bring your notes.',
      type,
      startAt: campusDateTimeToUtc(date, start),
      endAt: campusDateTimeToUtc(date, end),
      location,
      participantLimit: limit,
      status,
      organizerId: organizer,
      participations: { create: { userId: organizer, isOrganizer: true } },
    },
  });
  return row.id;
}

async function titles(path: string) {
  const res = await (await loggedInAgent(app)).get(`${API_PREFIX}${path}`);
  expect(res.status).toBe(200);
  return (res.body.items as { title: string }[]).map((item) => item.title);
}

describe('GET /activities/recommended (FR14–FR15)', () => {
  it('lists a matching activity with the card fields', async () => {
    const id = await activity();
    const res = await (await loggedInAgent(app)).get(`${API_PREFIX}/activities/recommended`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        {
          id,
          title: 'Midterm Study Group',
          type: 'STUDY',
          startAt: '2026-10-21T23:00:00.000Z',
          endAt: '2026-10-22T01:00:00.000Z',
          location: 'King Library',
          openSpots: 7,
          status: 'OPEN',
          organizer: { id: organizerId, displayName: 'Maya Chen' },
        },
      ],
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
  });

  it('(a) leaves out activities that are not Open', async () => {
    await activity({ status: 'FULL' });
    expect(await titles('/activities/recommended')).toEqual([]);
  });

  it('(b) leaves out activities that have started', async () => {
    await activity();
    time.advanceHours(8); // 5:00 PM on campus
    expect(await titles('/activities/recommended')).toEqual([]);
  });

  it('(c) leaves out types outside the student’s interests', async () => {
    await activity({ type: 'SPORTS' });
    expect(await titles('/activities/recommended')).toEqual([]);
  });

  it('(d) needs the whole activity inside an availability slot on its weekday', async () => {
    await activity({ title: 'Inside', start: '16:00', end: '18:00' });
    await activity({ title: 'Ends late', start: '17:00', end: '18:30' });
    await activity({ title: 'Starts early', start: '15:30', end: '17:00' });
    await activity({ title: 'Thursday', date: '2026-10-22' });
    await activity({ title: 'Next Wednesday', date: '2026-10-28', start: '16:30', end: '17:30' });
    expect(await titles('/activities/recommended')).toEqual(['Inside', 'Next Wednesday']);
  });

  it('(e) leaves out activities the student organizes or takes part in', async () => {
    await activity({ title: 'Mine', organizer: viewerId });
    const joined = await activity({ title: 'Joined' });
    await addParticipants(joined, [viewerId]);
    expect(await titles('/activities/recommended')).toEqual([]);
  });

  it('(f) leaves out organizers blocked in either direction', async () => {
    await activity();
    await db.block.create({ data: { blockerId: viewerId, blockedId: organizerId } });
    expect(await titles('/activities/recommended')).toEqual([]);

    await db.block.deleteMany();
    await db.block.create({ data: { blockerId: organizerId, blockedId: viewerId } });
    expect(await titles('/activities/recommended')).toEqual([]);
  });

  it('orders soonest first and reflects a profile edit on the next load', async () => {
    await activity({ title: 'Later', date: '2026-10-28' });
    await activity({ title: 'Sooner' });
    await activity({ title: 'Pickup Soccer', type: 'SPORTS' });
    expect(await titles('/activities/recommended')).toEqual(['Sooner', 'Later']);

    const agent = await loggedInAgent(app);
    await agent
      .patch(`${API_PREFIX}/users/me`)
      .send({ interests: ['SPORTS'] })
      .expect(200);
    expect(await titles('/activities/recommended')).toEqual(['Pickup Soccer']);
  });
});

describe('GET /activities (FR16–FR17)', () => {
  beforeEach(async () => {
    await activity({ title: 'Study Wed 4pm' });
    await activity({ title: 'Study Fri 10am', date: '2026-10-23', start: '10:00', end: '11:00' });
    await activity({
      title: 'Soccer Thu 5pm',
      type: 'SPORTS',
      date: '2026-10-22',
      start: '17:00',
      end: '19:00',
      location: 'Campus Recreation Field',
    });
    await activity({ title: 'Full', status: 'FULL' });
  });

  it('with no criteria, lists every Open, upcoming activity, soonest first', async () => {
    expect(await titles('/activities')).toEqual([
      'Study Wed 4pm',
      'Soccer Thu 5pm',
      'Study Fri 10am',
    ]);
  });

  it('applies every given criterion together, and clearing one broadens the results', async () => {
    const both = '/activities?type=STUDY&fromDate=2026-10-22&toDate=2026-10-23';
    expect(await titles(both)).toEqual(['Study Fri 10am']);
    expect(await titles('/activities?fromDate=2026-10-22&toDate=2026-10-23')).toEqual([
      'Soccer Thu 5pm',
      'Study Fri 10am',
    ]);
    expect(await titles('/activities?earliestStart=16:00&latestStart=17:00')).toEqual([
      'Study Wed 4pm',
      'Soccer Thu 5pm',
    ]);
    expect(await titles('/activities?type=&location=recreation')).toEqual(['Soccer Thu 5pm']);
  });

  it('matches any part of the location literally, ignoring case', async () => {
    await activity({ title: 'Room 100%', location: 'Room 100% fun' });
    expect(await titles('/activities?location=KING')).toEqual(['Study Wed 4pm', 'Study Fri 10am']);
    expect(await titles('/activities?location=100%25')).toEqual(['Room 100%']);
    expect(await titles('/activities?location=10_')).toEqual([]);
  });

  it('leaves out started activities and blocked organizers, but keeps the viewer’s own', async () => {
    await activity({ title: 'Mine', organizer: viewerId, date: '2026-10-24' });
    time.advanceHours(8); // Wednesday 5:00 PM: "Study Wed 4pm" has started
    expect(await titles('/activities')).toEqual(['Soccer Thu 5pm', 'Study Fri 10am', 'Mine']);

    await db.block.create({ data: { blockerId: organizerId, blockedId: viewerId } });
    expect(await titles('/activities')).toEqual(['Mine']);
  });

  it('pages the results', async () => {
    const res = await (await loggedInAgent(app)).get(`${API_PREFIX}/activities?pageSize=2&page=2`);
    expect(res.body).toMatchObject({ page: 2, pageSize: 2, hasMore: false });
    expect(res.body.items).toHaveLength(1);
  });

  it('rejects invalid criteria with one message per field', async () => {
    const agent = await loggedInAgent(app);
    const bad = await agent.get(`${API_PREFIX}/activities?type=HIKING&earliestStart=4pm`);
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.fields).sort()).toEqual(['earliestStart', 'type']);

    const reversed = await agent.get(
      `${API_PREFIX}/activities?fromDate=2026-10-23&toDate=2026-10-22`,
    );
    expect(reversed.status).toBe(422);
    expect(reversed.body.error.fields.toDate).toMatch(/on or after/);
  });

  it('needs a logged-in student', async () => {
    const res = await request(app).get(`${API_PREFIX}/activities`);
    expect(res.status).toBe(401);
  });
});
