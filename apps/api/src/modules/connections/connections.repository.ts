import type { ActivityType, ConnectionState } from '@sh/shared';
import { orderedPair } from '../../common/relationships.js';
import type { DbClient } from '../../db.js';
import { Prisma } from '../../generated/prisma/client.js';

// The discover query is raw SQL because it orders by the number of shared interests (FR44).

export interface StudentRow {
  id: string;
  displayName: string;
  sharedInterests: ActivityType[];
  connectionState: ConnectionState;
}

export interface PageWindow {
  limit: number;
  offset: number;
}

/**
 * Active students other than the viewer, with the interests they share with the viewer and any
 * pending request between them, ordered by shared count, then name.
 * `discover` (FR43): at least one shared interest, not connected, no block either way.
 * `connected` (FR13's connection list): the viewer's connections.
 */
export function studentCards(
  client: DbClient,
  viewerId: string,
  mode: 'discover' | 'connected',
  window: PageWindow,
) {
  const isConnected = Prisma.sql`EXISTS (
    SELECT 1 FROM "connection" c
    WHERE c.user_a_id = LEAST(u.id, ${viewerId}::uuid)
      AND c.user_b_id = GREATEST(u.id, ${viewerId}::uuid))`;
  const filter =
    mode === 'discover'
      ? Prisma.sql`u.interests && me.interests AND NOT ${isConnected}`
      : isConnected;

  return client.$queryRaw<StudentRow[]>`
    WITH me AS (SELECT interests FROM "user" WHERE id = ${viewerId}::uuid),
    candidates AS (
      SELECT
        u.id,
        u.display_name AS "displayName",
        ARRAY(
          SELECT t FROM (SELECT unnest(u.interests) AS t INTERSECT SELECT unnest(me.interests)) s
          ORDER BY t
        )::text[] AS "sharedInterests",
        CASE
          WHEN ${isConnected} THEN 'connected'
          WHEN EXISTS (SELECT 1 FROM "connection_request" r
                       WHERE r.sender_id = ${viewerId}::uuid AND r.recipient_id = u.id)
            THEN 'pending_outgoing'
          WHEN EXISTS (SELECT 1 FROM "connection_request" r
                       WHERE r.sender_id = u.id AND r.recipient_id = ${viewerId}::uuid)
            THEN 'pending_incoming'
          ELSE 'none'
        END AS "connectionState"
      FROM "user" u, me
      WHERE u.status = 'ACTIVE'
        AND u.id <> ${viewerId}::uuid
        AND ${filter}
        AND NOT EXISTS (
          SELECT 1 FROM "block" b
          WHERE (b.blocker_id = ${viewerId}::uuid AND b.blocked_id = u.id)
             OR (b.blocker_id = u.id AND b.blocked_id = ${viewerId}::uuid))
    )
    SELECT * FROM candidates
    ORDER BY cardinality("sharedInterests") DESC, lower("displayName") ASC, id ASC
    LIMIT ${window.limit} OFFSET ${window.offset}`;
}

export function findActiveUser(client: DbClient, userId: string) {
  return client.user.findFirst({
    where: { id: userId, status: 'ACTIVE' },
    select: { id: true, displayName: true },
  });
}

export function insertRequest(client: DbClient, senderId: string, recipientId: string, now: Date) {
  return client.connectionRequest.create({
    data: { senderId, recipientId, createdAt: now },
    select: { id: true },
  });
}

/** A request addressed to `recipientId`, with the sender's name. */
export function findIncomingRequest(client: DbClient, requestId: string, recipientId: string) {
  return client.connectionRequest.findFirst({
    where: { id: requestId, recipientId },
    select: { id: true, senderId: true, sender: { select: { displayName: true } } },
  });
}

export async function deleteRequest(client: DbClient, requestId: string) {
  const { count } = await client.connectionRequest.deleteMany({ where: { id: requestId } });
  return count === 1;
}

/** Pending requests to (incoming) or from (outgoing) the student, newest first. */
export function listRequests(client: DbClient, userId: string, direction: 'incoming' | 'outgoing') {
  return client.connectionRequest.findMany({
    where: direction === 'incoming' ? { recipientId: userId } : { senderId: userId },
    select: {
      id: true,
      createdAt: true,
      sender: { select: { id: true, displayName: true } },
      recipient: { select: { id: true, displayName: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
}

/** FR46: stored once per pair, smaller id first. Already connected is fine. */
export function insertConnection(client: DbClient, a: string, b: string, now: Date) {
  return client.connection.createMany({
    data: [{ ...orderedPair(a, b), createdAt: now }],
    skipDuplicates: true,
  });
}
