import type { DbClient } from '../../db.js';
import { ActivityStatus, type ActivityType } from '../../generated/prisma/client.js';

// Activity queries. The guarded update is raw SQL because the status has to be recomputed from
// the row's current participant count in the same statement (ADR-0010).

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
