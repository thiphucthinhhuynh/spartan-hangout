import {
  ActivityMessageKind,
  ActivityStatus,
  ErrorCode,
  MESSAGES,
  NotificationType,
  type ActivityDetailDto,
  type ActivityMessageDto,
} from '@sh/shared';
import { ConflictError, ForbiddenError } from '../../common/errors.js';
import { idsBlockedBy } from '../../common/relationships.js';
import type { AppDeps } from '../../deps.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ActivityService } from '../activities/activity.service.js';
import { createNotifications } from '../notifications/notifications.service.js';

// Activity group chat and organizer updates (FR35–FR39). Simple inserts and lists, so the service
// calls Prisma directly (architecture §5). Activity rules come from the activities service.

const messageSelect = {
  id: true,
  kind: true,
  body: true,
  createdAt: true,
  sender: { select: { id: true, displayName: true } },
} as const;

type MessageRow = Prisma.ActivityMessageGetPayload<{ select: typeof messageSelect }>;

function toMessageDto(row: MessageRow): ActivityMessageDto {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    sender: row.sender
      ? { id: row.sender.id, displayName: row.sender.displayName }
      : { id: null, displayName: MESSAGES.deletedStudent },
  };
}

function isEnded(activity: ActivityDetailDto) {
  return (
    activity.status === ActivityStatus.CANCELLED || activity.status === ActivityStatus.COMPLETED
  );
}

export function createMessagesService(
  { db, clock }: Pick<AppDeps, 'db' | 'clock'>,
  activities: ActivityService,
) {
  /**
   * FR35: only current participants (the organizer included) can read or write. A participation
   * row is the access, so leaving or being removed ends it. Outsiders of a Cancelled or
   * Completed activity get 404 from getDetail, as for the activity itself.
   */
  async function loadForMember(viewerId: string, activityId: string) {
    const activity = await activities.getDetail(viewerId, activityId);
    if (activity.viewerRole === 'none') {
      throw new ForbiddenError('Only participants can see this group chat. Join to take part.');
    }
    return activity;
  }

  return {
    /**
     * FR36: oldest first. `after` (a message id) returns only newer messages, for polling.
     * FR55c: messages from students the viewer blocked are left out for the viewer only.
     */
    async list(
      viewerId: string,
      activityId: string,
      after?: string,
    ): Promise<ActivityMessageDto[]> {
      await loadForMember(viewerId, activityId);
      const cursor = after
        ? await db.activityMessage.findFirst({
            where: { id: after, activityId },
            select: { seq: true },
          })
        : null;
      const hidden = await idsBlockedBy(db, viewerId);

      const rows = await db.activityMessage.findMany({
        where: {
          activityId,
          ...(cursor ? { seq: { gt: cursor.seq } } : {}),
          // A plain `notIn` would also drop messages whose sender deleted their account (null).
          ...(hidden.length > 0
            ? { OR: [{ senderId: null }, { senderId: { notIn: hidden } }] }
            : {}),
        },
        select: messageSelect,
        orderBy: { seq: 'asc' },
      });
      return rows.map(toMessageDto);
    },

    /** FR36–FR37: a participant's message; the chat is read-only once Cancelled or Completed. */
    async send(viewerId: string, activityId: string, body: string): Promise<ActivityMessageDto> {
      const activity = await loadForMember(viewerId, activityId);
      if (isEnded(activity)) {
        throw new ConflictError(
          ErrorCode.CHAT_READ_ONLY,
          'This chat is read-only because the activity has ended or was cancelled.',
        );
      }
      const row = await db.activityMessage.create({
        data: { activityId, senderId: viewerId, body, createdAt: clock.now() },
        select: messageSelect,
      });
      return toMessageDto(row);
    },

    /**
     * FR38–FR39, FR40c: the organizer posts a labeled update while the activity is Open or Full
     * (also after it starts, open question Q22) and every other participant is notified.
     */
    async postUpdate(
      viewerId: string,
      activityId: string,
      body: string,
    ): Promise<ActivityMessageDto> {
      const activity = await loadForMember(viewerId, activityId);
      if (activity.viewerRole !== 'organizer') {
        throw new ForbiddenError('Only the organizer can post updates.');
      }
      if (isEnded(activity)) {
        throw new ConflictError(
          ErrorCode.ACTIVITY_NOT_OPEN,
          'Updates can only be posted while the activity is open or full.',
        );
      }

      return db.$transaction(async (tx) => {
        const row = await tx.activityMessage.create({
          data: {
            activityId,
            senderId: viewerId,
            kind: ActivityMessageKind.UPDATE,
            body,
            createdAt: clock.now(),
          },
          select: messageSelect,
        });
        const recipients = await activities.otherParticipantIds(tx, activityId, viewerId);
        await createNotifications(
          tx,
          recipients.map((recipientId) => ({
            recipientId,
            type: NotificationType.ACTIVITY_UPDATE,
            activityId,
            activityTitle: activity.title,
            actorId: viewerId,
            body,
          })),
        );
        return toMessageDto(row);
      });
    },
  };
}

export type MessagesService = ReturnType<typeof createMessagesService>;
