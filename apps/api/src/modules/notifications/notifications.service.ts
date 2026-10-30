import {
  NotificationType,
  type NotificationDto,
  type Paged,
  type PaginationInput,
} from '@sh/shared';
import { NotFoundError } from '../../common/errors.js';
import type { DbClient } from '../../db.js';
import type { AppDeps } from '../../deps.js';

// Notifications are created with the client of the transaction that made the change, so a change
// and its notifications are saved together or not at all (architecture §11.6).

export interface NewNotification {
  recipientId: string;
  type: NotificationType;
  activityId?: string;
  /** Snapshot of the activity title (FR42). */
  activityTitle?: string;
  /** Who caused it (organizer, joining student, …). */
  actorId?: string;
  body?: string;
}

export async function createNotifications(client: DbClient, notifications: NewNotification[]) {
  if (notifications.length === 0) return;
  await client.notification.createMany({ data: notifications });
}

interface NotificationRow {
  id: string;
  type: NotificationType;
  activityId: string | null;
  activityTitle: string | null;
  actorId: string | null;
  body: string | null;
  readAt: Date | null;
  createdAt: Date;
}

function toNotificationDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    activityId: row.activityId,
    activityTitle: row.activityTitle,
    actorId: row.actorId,
    conversationUserId: row.type === NotificationType.DIRECT_MESSAGE ? row.actorId : null,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    read: row.readAt !== null,
  };
}

/** FR42: the student's own notifications. Simple Prisma reads, so no repository layer. */
export function createNotificationsService({ db, clock }: Pick<AppDeps, 'db' | 'clock'>) {
  return {
    /** Newest first. */
    async list(
      userId: string,
      { page, pageSize }: PaginationInput,
    ): Promise<Paged<NotificationDto>> {
      const rows = await db.notification.findMany({
        where: { recipientId: userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize + 1,
      });
      return {
        items: rows.slice(0, pageSize).map(toNotificationDto),
        page,
        pageSize,
        hasMore: rows.length > pageSize,
      };
    },

    async unreadCount(userId: string): Promise<number> {
      return db.notification.count({ where: { recipientId: userId, readAt: null } });
    },

    /** Opening a notification marks it read. Only the recipient can; anyone else gets 404. */
    async markRead(userId: string, notificationId: string): Promise<void> {
      const { count } = await db.notification.updateMany({
        where: { id: notificationId, recipientId: userId },
        data: { readAt: clock.now() },
      });
      if (count === 0) throw new NotFoundError('We couldn’t find that notification.');
    },
  };
}

export type NotificationsService = ReturnType<typeof createNotificationsService>;
