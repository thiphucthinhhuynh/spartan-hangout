// Development demo data: students and activities resembling the UI mockups (roadmap task 67).
// Run with `npm run db:seed`. Every demo account's password is "goSpartans1".
// Safe to run twice (it stops if the demo data exists) and refuses to run in production.
import { PrismaPg } from '@prisma/adapter-pg';
import { campusDateTimeToUtc, timeToMinutes, utcToCampusParts } from '@sh/shared';
import { hashPassword } from '../src/common/password.js';
import {
  PrismaClient,
  type ActivityStatus,
  type ActivityType,
} from '../src/generated/prisma/client.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data in production.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (copy apps/api/.env.example to apps/api/.env).');
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const PASSWORD = 'goSpartans1';

type Slot = [day: number, start: string, end: string];
const students: {
  key: string;
  name: string;
  interests: ActivityType[];
  availability: Slot[];
}[] = [
  {
    key: 'maya.chen',
    name: 'Maya Chen',
    interests: ['STUDY', 'FOOD'],
    availability: [
      [1, '15:00', '19:00'],
      [3, '15:00', '19:00'],
    ],
  },
  {
    key: 'alex.rivera',
    name: 'Alex Rivera',
    interests: ['SPORTS', 'GAMING'],
    availability: [
      [2, '16:00', '20:00'],
      [4, '16:00', '20:00'],
    ],
  },
  {
    key: 'jordan.lee',
    name: 'Jordan Lee',
    interests: ['SOCIAL', 'FOOD'],
    availability: [[5, '12:00', '17:00']],
  },
  {
    key: 'priya.nair',
    name: 'Priya Nair',
    interests: ['STUDY', 'SOCIAL'],
    availability: [[1, '10:00', '14:00']],
  },
  {
    key: 'sam.kim',
    name: 'Sam Kim',
    interests: ['SPORTS', 'STUDY'],
    availability: [[3, '16:00', '21:00']],
  },
  {
    key: 'lena.tran',
    name: 'Lena Tran',
    interests: ['GAMING', 'SOCIAL'],
    availability: [[6, '18:00', '23:00']],
  },
  {
    key: 'sammy.spartan',
    name: 'Sammy Spartan',
    interests: ['STUDY', 'SPORTS', 'FOOD'],
    availability: [
      [0, '10:00', '18:00'],
      [3, '15:00', '19:00'],
    ],
  },
];

/** "YYYY-MM-DD" plus n days. */
function addDays(date: string, days: number): string {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const today = utcToCampusParts(new Date()).date;
const activities: {
  title: string;
  description: string;
  type: ActivityType;
  organizer: string;
  day: number;
  start: string;
  end: string;
  location: string;
  limit: number;
  others: string[];
  status?: ActivityStatus;
}[] = [
  {
    title: 'Midterm Study Group',
    description:
      'Bring your notes and settle in for a relaxed midterm study session. We’ll do focused study blocks, help each other out, and take a break together. All majors welcome!\n\nBring your laptop, notes & a water bottle.',
    type: 'STUDY',
    organizer: 'maya.chen',
    day: 1,
    start: '16:00',
    end: '18:00',
    location: 'King Library, 2nd floor, Group Study Room 225',
    limit: 8,
    others: ['alex.rivera', 'priya.nair', 'sam.kim', 'lena.tran'],
  },
  {
    title: 'Pickup Soccer',
    description:
      'Casual pickup game, all skill levels. We’ll split teams when everyone arrives. Bring water and shoes you can run in.',
    type: 'SPORTS',
    organizer: 'alex.rivera',
    day: 1,
    start: '17:30',
    end: '19:00',
    location: 'Campus Recreation Field',
    limit: 10,
    others: ['sam.kim', 'sammy.spartan', 'lena.tran', 'priya.nair', 'jordan.lee', 'maya.chen'],
  },
  {
    title: 'Coffee & Meet New Friends',
    description:
      'New to SJSU or just want to meet people? Grab a coffee and chat. No agenda, just good company.',
    type: 'SOCIAL',
    organizer: 'jordan.lee',
    day: 2,
    start: '14:00',
    end: '15:30',
    location: 'Student Union, ground floor',
    limit: 6,
    others: [],
  },
  {
    title: 'Smash Bros Night',
    description: 'Bring a controller if you have one. Casual bracket, snacks provided.',
    type: 'GAMING',
    organizer: 'lena.tran',
    day: 3,
    start: '19:00',
    end: '22:00',
    location: 'Campus Village, Building B lounge',
    limit: 4,
    others: ['alex.rivera', 'sammy.spartan', 'jordan.lee'],
    status: 'FULL',
  },
  {
    title: 'Taco Tuesday Lunch',
    description: 'Lunch run to the taco place on San Fernando St.',
    type: 'FOOD',
    organizer: 'priya.nair',
    day: -1,
    start: '12:00',
    end: '13:00',
    location: 'Meet at the Student Union entrance',
    limit: 6,
    others: ['maya.chen', 'sammy.spartan'],
    status: 'COMPLETED',
  },
];

async function main() {
  const emails = students.map((s) => `${s.key}@sjsu.edu`);
  const existing = await db.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  if (existing.length === emails.length) {
    console.log('Demo data is already there; nothing to do.');
    return;
  }
  if (existing.length > 0) {
    console.error(
      `Some demo emails are already registered (${existing.map((u) => u.email).join(', ')}), ` +
        'so nothing was changed. Use `npm run db:reset` for a fresh database.',
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(PASSWORD);
  // One transaction: if anything fails, no half-seeded data is left behind.
  await db.$transaction(async (tx) => {
    const ids = new Map<string, string>();
    for (const s of students) {
      const user = await tx.user.create({
        data: {
          email: `${s.key}@sjsu.edu`,
          passwordHash,
          displayName: s.name,
          interests: s.interests,
          status: 'ACTIVE',
          availability: {
            create: s.availability.map(([dayOfWeek, start, end]) => ({
              dayOfWeek,
              startMinute: timeToMinutes(start),
              endMinute: timeToMinutes(end),
            })),
          },
        },
      });
      ids.set(s.key, user.id);
    }

    for (const a of activities) {
      const date = addDays(today, a.day);
      const others = a.others.filter((key) => key !== a.organizer);
      await tx.activity.create({
        data: {
          title: a.title,
          description: a.description,
          type: a.type,
          startAt: campusDateTimeToUtc(date, a.start),
          endAt: campusDateTimeToUtc(date, a.end),
          location: a.location,
          participantLimit: a.limit,
          participantCount: 1 + others.length,
          status: a.status ?? 'OPEN',
          organizerId: ids.get(a.organizer)!,
          participations: {
            create: [
              { userId: ids.get(a.organizer)!, isOrganizer: true },
              ...others.map((key) => ({ userId: ids.get(key)! })),
            ],
          },
        },
      });
    }
  });

  console.log(
    `Seeded ${students.length} demo students and ${activities.length} activities. ` +
      `Log in as sammy.spartan@sjsu.edu (or any of ${students.map((s) => s.key).join(', ')}) ` +
      `with password "${PASSWORD}".`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
