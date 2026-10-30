import type { ConnectionState } from '@sh/shared';
import type { DbClient } from '../db.js';

// The one place that answers "has either student blocked the other?" and "are they connected?"
// (architecture §4.2). Every module asks here instead of querying the tables itself, so block
// rules (FR55–FR57) apply everywhere.

/** Connections are stored once per pair, smaller id first (`connection` CHECK constraint). */
export function orderedPair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export async function isBlockedEitherWay(client: DbClient, a: string, b: string): Promise<boolean> {
  const count = await client.block.count({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return count > 0;
}

/** Everyone `userId` has blocked or been blocked by, for filtering lists (FR57). */
export async function blockedIdsFor(client: DbClient, userId: string): Promise<Set<string>> {
  const rows = await client.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return new Set(rows.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId)));
}

/** Students `userId` has blocked (one direction only), e.g. to hide their chat messages (FR55c). */
export async function idsBlockedBy(client: DbClient, userId: string): Promise<string[]> {
  const rows = await client.block.findMany({
    where: { blockerId: userId },
    select: { blockedId: true },
  });
  return rows.map((row) => row.blockedId);
}

export async function areConnected(client: DbClient, a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const connection = await client.connection.findUnique({
    where: { userAId_userBId: orderedPair(a, b) },
    select: { userAId: true },
  });
  return connection !== null;
}

/** How `viewerId` is related to `otherId`: connected, a pending request either way, or none. */
export async function connectionStateBetween(
  client: DbClient,
  viewerId: string,
  otherId: string,
): Promise<ConnectionState> {
  if (await areConnected(client, viewerId, otherId)) return 'connected';
  const request = await client.connectionRequest.findFirst({
    where: {
      OR: [
        { senderId: viewerId, recipientId: otherId },
        { senderId: otherId, recipientId: viewerId },
      ],
    },
    select: { senderId: true },
  });
  if (!request) return 'none';
  return request.senderId === viewerId ? 'pending_outgoing' : 'pending_incoming';
}
