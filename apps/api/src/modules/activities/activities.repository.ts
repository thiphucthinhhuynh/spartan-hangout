import { CAMPUS_TIME_ZONE, type ActivitySearchCriteria } from '@sh/shared';
import type { DbClient } from '../../db.js';
import { ActivityStatus, Prisma, type ActivityType } from '../../generated/prisma/client.js';

// Activity queries. The guarded update is raw SQL because the status has to be recomputed from
// the row's current participant count in the same statement (ADR-0010). Search and
// recommendations are raw SQL because they match campus-local dates and times (ADR-0011).

const activitySelect = {
  id: true,
  organizerId: true,
  title: true,
  description: true,
  type: true,
  startAt: true,
  endAt: true,
  location: true,
  participantLimit: true,
  participantCount: true,
  status: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
  organizer: { select: { id: true, displayName: true } },
} as const;

export interface ActivityValues {
  title: string;
  description: string;
  type: ActivityType;
  startAt: Date;
  endAt: Date;
  location: string;
  participantLimit: number;
}

/** FR28: the activity starts Open with the organizer as its first participant (count 1). */
export function insertActivity(
  client: DbClient,
  organizerId: string,
  values: ActivityValues,
  now: Date,
) {
  return client.activity.create({
    data: {
      ...values,
      organizerId,
      status: ActivityStatus.OPEN,
      participantCount: 1,
      participations: { create: { userId: organizerId, isOrganizer: true, joinedAt: now } },
    },
    select: { id: true },
  });
}

/** The activity plus whether the viewer takes part in it. */
export function findActivityForViewer(client: DbClient, activityId: string, viewerId: string) {
  return client.activity.findUnique({
    where: { id: activityId },
    select: {
      ...activitySelect,
      participations: { where: { userId: viewerId }, select: { isOrganizer: true } },
      removals: { where: { userId: viewerId }, select: { userId: true } },
    },
  });
}

/**
 * FR29–FR30 in one statement: only while Open or Full and not started, never below the current
 * participant count, and the status recomputed from that count. Returns false when a guard fails.
 */
export async function updateActivityGuarded(
  client: DbClient,
  activityId: string,
  values: ActivityValues,
  now: Date,
): Promise<boolean> {
  const rows = await client.$queryRaw<{ id: string }[]>`
    UPDATE "activity" SET
      title = ${values.title},
      description = ${values.description},
      type = ${values.type}::"ActivityType",
      start_at = ${values.startAt},
      end_at = ${values.endAt},
      location = ${values.location},
      participant_limit = ${values.participantLimit},
      status = (CASE WHEN participant_count >= ${values.participantLimit} THEN 'FULL' ELSE 'OPEN' END)::"ActivityStatus",
      updated_at = ${now}
    WHERE id = ${activityId}::uuid
      AND status IN ('OPEN', 'FULL')
      AND start_at > ${now}
      AND participant_count <= ${values.participantLimit}
    RETURNING id`;
  return rows.length === 1;
}

/**
 * FR31–FR32: Cancelled for good, only while Open or Full and not started. Returns false when a
 * guard fails (e.g. it started, or was cancelled, a moment ago).
 */
export async function cancelActivityGuarded(
  client: DbClient,
  activityId: string,
  reason: string | null,
  now: Date,
): Promise<boolean> {
  const rows = await client.$queryRaw<{ id: string }[]>`
    UPDATE "activity" SET
      status = 'CANCELLED'::"ActivityStatus",
      cancellation_reason = ${reason},
      updated_at = ${now}
    WHERE id = ${activityId}::uuid
      AND status IN ('OPEN', 'FULL')
      AND start_at > ${now}
    RETURNING id`;
  return rows.length === 1;
}

/** Everyone in the activity except `excludeUserId`, for notifications. */
export async function participantIds(client: DbClient, activityId: string, excludeUserId: string) {
  const rows = await client.participation.findMany({
    where: { activityId, userId: { not: excludeUserId } },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

/** FR20: Open and Full activities whose end time has passed become Completed. */
export async function completeEndedActivities(client: DbClient, now: Date): Promise<number> {
  const { count } = await client.activity.updateMany({
    where: { status: { in: [ActivityStatus.OPEN, ActivityStatus.FULL] }, endAt: { lte: now } },
    data: { status: ActivityStatus.COMPLETED },
  });
  return count;
}

// ─── Finding activities (FR14–FR17) ─────────────────────────────────────────

export interface PageWindow {
  limit: number;
  offset: number;
}

const localStart = Prisma.sql`(a.start_at AT TIME ZONE ${CAMPUS_TIME_ZONE}::text)`;
const localEnd = Prisma.sql`(a.end_at AT TIME ZONE ${CAMPUS_TIME_ZONE}::text)`;

/** Minutes after campus-local midnight, comparable with availability_slot minutes. */
function minuteOfDay(local: Prisma.Sql) {
  return Prisma.sql`(EXTRACT(HOUR FROM ${local}) * 60 + EXTRACT(MINUTE FROM ${local}))`;
}

/** FR14f, FR17: no block in either direction between the viewer and the organizer. */
function notBlockedWithOrganizer(viewerId: string) {
  return Prisma.sql`NOT EXISTS (
    SELECT 1 FROM "block" b
    WHERE (b.blocker_id = ${viewerId}::uuid AND b.blocked_id = a.organizer_id)
       OR (b.blocker_id = a.organizer_id AND b.blocked_id = ${viewerId}::uuid))`;
}

/** `%` and `_` in the student's text are matched literally. */
function containsPattern(text: string) {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Ids of the activities meeting every condition, soonest first (FR15, FR17). */
async function pageOfIds(client: DbClient, conditions: Prisma.Sql[], window: PageWindow) {
  const rows = await client.$queryRaw<{ id: string }[]>`
    SELECT a.id FROM "activity" a
    WHERE ${Prisma.join(conditions, ' AND ')}
    ORDER BY a.start_at ASC, a.id ASC
    LIMIT ${window.limit} OFFSET ${window.offset}`;
  return rows.map((row) => row.id);
}

/**
 * FR16–FR17: Open, not yet started, organizer not blocked either way, plus every criterion given.
 * Dates and start times are compared in campus time; both ends of each range are included.
 */
export function searchActivityIds(
  client: DbClient,
  viewerId: string,
  criteria: ActivitySearchCriteria,
  now: Date,
  window: PageWindow,
) {
  const conditions = [
    Prisma.sql`a.status = 'OPEN'`,
    Prisma.sql`a.start_at > ${now}`,
    notBlockedWithOrganizer(viewerId),
  ];
  if (criteria.type) conditions.push(Prisma.sql`a.type = ${criteria.type}::"ActivityType"`);
  if (criteria.fromDate)
    conditions.push(Prisma.sql`${localStart}::date >= ${criteria.fromDate}::date`);
  if (criteria.toDate) conditions.push(Prisma.sql`${localStart}::date <= ${criteria.toDate}::date`);
  if (criteria.earliestStart) {
    conditions.push(Prisma.sql`${localStart}::time >= ${criteria.earliestStart}::time`);
  }
  if (criteria.latestStart) {
    conditions.push(Prisma.sql`${localStart}::time <= ${criteria.latestStart}::time`);
  }
  if (criteria.location) {
    conditions.push(Prisma.sql`a.location ILIKE ${containsPattern(criteria.location)}`);
  }
  return pageOfIds(client, conditions, window);
}

/**
 * FR14 (a)–(f), architecture §11.3: Open, in the future, one of the viewer's interests, the whole
 * activity inside one of the viewer's availability slots for that weekday, not already organizing
 * or taking part, and no block with the organizer. Reads the profile live, so edits apply at once
 * (FR15).
 */
export function recommendedActivityIds(
  client: DbClient,
  viewerId: string,
  now: Date,
  window: PageWindow,
) {
  return pageOfIds(
    client,
    [
      Prisma.sql`a.status = 'OPEN'`,
      Prisma.sql`a.start_at > ${now}`,
      Prisma.sql`a.type = ANY (SELECT unnest(u.interests) FROM "user" u WHERE u.id = ${viewerId}::uuid)`,
      Prisma.sql`EXISTS (
        SELECT 1 FROM "availability_slot" s
        WHERE s.user_id = ${viewerId}::uuid
          AND s.day_of_week = EXTRACT(DOW FROM ${localStart})
          AND s.start_minute <= ${minuteOfDay(localStart)}
          AND s.end_minute >= ${minuteOfDay(localEnd)})`,
      Prisma.sql`NOT EXISTS (
        SELECT 1 FROM "participation" p
        WHERE p.activity_id = a.id AND p.user_id = ${viewerId}::uuid)`,
      notBlockedWithOrganizer(viewerId),
    ],
    window,
  );
}

/** The card fields for the given activities, in the order of `ids`. */
export async function findActivitiesInOrder(client: DbClient, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await client.activity.findMany({
    where: { id: { in: ids } },
    select: activitySelect,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

// ─── Participation (FR19, FR21–FR25, FR33–FR34) ─────────────────────────────
// Every change to participation also changes participant_count in the same transaction, with the
// activity row updated first so its row lock orders concurrent joins, leaves and removals
// (ADR-0010). updated_at is left alone: it is the "last updated" time of organizer edits (FR30).

/**
 * FR22–FR23: takes one spot if the activity is still Open, not started and not full, and makes it
 * Full when that was the last spot. Returns false when another request got there first.
 */
export async function reserveSpot(client: DbClient, activityId: string, now: Date) {
  const rows = await client.$queryRaw<{ id: string }[]>`
    UPDATE "activity" SET
      participant_count = participant_count + 1,
      status = (CASE WHEN participant_count + 1 >= participant_limit THEN 'FULL' ELSE 'OPEN' END)::"ActivityStatus"
    WHERE id = ${activityId}::uuid
      AND status = 'OPEN'
      AND participant_count < participant_limit
      AND start_at > ${now}
    RETURNING id`;
  return rows.length === 1;
}

/** FR25, FR34: gives a spot back (Full becomes Open) while Open or Full and not started. */
export async function releaseSpot(client: DbClient, activityId: string, now: Date) {
  const rows = await client.$queryRaw<{ id: string }[]>`
    UPDATE "activity" SET
      participant_count = participant_count - 1,
      status = 'OPEN'::"ActivityStatus"
    WHERE id = ${activityId}::uuid
      AND status IN ('OPEN', 'FULL')
      AND start_at > ${now}
    RETURNING id`;
  return rows.length === 1;
}

export function insertParticipation(
  client: DbClient,
  activityId: string,
  userId: string,
  now: Date,
) {
  return client.participation.create({ data: { activityId, userId, joinedAt: now } });
}

/** Removes a non-organizer participant. Returns false when there was no such row. */
export async function deleteParticipation(client: DbClient, activityId: string, userId: string) {
  const { count } = await client.participation.deleteMany({
    where: { activityId, userId, isOrganizer: false },
  });
  return count === 1;
}

export function insertRemoval(
  client: DbClient,
  activityId: string,
  userId: string,
  reason: string | null,
  now: Date,
) {
  return client.activityRemoval.create({ data: { activityId, userId, reason, removedAt: now } });
}

/** FR19: everyone in the activity, organizer first, then in the order they joined. */
export function listParticipants(client: DbClient, activityId: string) {
  return client.participation.findMany({
    where: { activityId },
    select: { userId: true, isOrganizer: true, user: { select: { displayName: true } } },
    orderBy: [{ isOrganizer: 'desc' }, { joinedAt: 'asc' }, { userId: 'asc' }],
  });
}

export type MyActivitiesFilter = {
  role: 'joined' | 'organizing';
  when: 'upcoming' | 'past';
};

/**
 * "My plans": activities the student joined or organizes. Upcoming = Open or Full and not ended,
 * soonest first; past = ended, Completed or Cancelled, most recent first.
 */
export function findMyActivities(
  client: DbClient,
  userId: string,
  { role, when }: MyActivitiesFilter,
  now: Date,
  window: PageWindow,
) {
  const live = [ActivityStatus.OPEN, ActivityStatus.FULL];
  return client.activity.findMany({
    where: {
      participations: { some: { userId, isOrganizer: role === 'organizing' } },
      ...(when === 'upcoming'
        ? { status: { in: live }, endAt: { gt: now } }
        : { OR: [{ status: { notIn: live } }, { endAt: { lte: now } }] }),
    },
    select: activitySelect,
    orderBy:
      when === 'upcoming'
        ? [{ startAt: 'asc' }, { id: 'asc' }]
        : [{ startAt: 'desc' }, { id: 'asc' }],
    take: window.limit,
    skip: window.offset,
  });
}
