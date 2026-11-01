import { ForbiddenError, NotFoundError } from '../../common/errors.js';
import type { AppDeps } from '../../deps.js';
import { UserStatus } from '../../generated/prisma/client.js';
import type { ParticipationService } from '../activities/participation.service.js';
import type { ConnectionsService } from '../connections/connections.service.js';

// Blocking (FR54–FR57, architecture §11.4). The lasting effects are applied when data is read,
// through common/relationships; this service makes the one-time changes.

export function createBlocksService(
  { db, clock }: Pick<AppDeps, 'db' | 'clock'>,
  connections: ConnectionsService,
  participation: ParticipationService,
) {
  return {
    /**
     * FR54–FR56, in one transaction: record the block, end the connection and any pending request,
     * and remove the blocked student from the blocker's upcoming activities. Nobody is told about
     * the block. Blocking someone twice changes nothing further.
     */
    async block(blockerId: string, blockedId: string): Promise<void> {
      if (blockerId === blockedId) throw new ForbiddenError('You can’t block yourself.');
      const target = await db.user.findFirst({
        where: { id: blockedId, status: UserStatus.ACTIVE },
        select: { id: true },
      });
      if (!target) throw new NotFoundError('We couldn’t find that student.');

      await db.$transaction(async (tx) => {
        await tx.block.createMany({
          data: [{ blockerId, blockedId, createdAt: clock.now() }],
          skipDuplicates: true,
        });
        await connections.removeBetween(tx, blockerId, blockedId);
        await participation.removeForBlock(tx, blockerId, blockedId);
      });
    },
  };
}

export type BlocksService = ReturnType<typeof createBlocksService>;
