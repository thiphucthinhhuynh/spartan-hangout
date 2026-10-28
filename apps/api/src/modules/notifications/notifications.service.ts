import type { NotificationType } from '@sh/shared';
import type { DbClient } from '../../db.js';

// Notifications are created with the client of the transaction that made the change, so a change
// and its notifications are saved together or not at all (architecture §11.6). The list and
// read/unread endpoints arrive in Milestone 7.

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
