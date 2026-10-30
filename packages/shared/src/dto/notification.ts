import type { NotificationType } from '../enums.js';

/** GET /notifications (FR42). */
export interface NotificationDto {
  id: string;
  type: NotificationType;
  /** The related activity; null when it isn't about one, or the activity no longer exists. */
  activityId: string | null;
  /** The activity's title when the notification was created (FR42). */
  activityTitle: string | null;
  /** Direct messages link to the conversation with this student (FR49, from Milestone 10). */
  conversationUserId: string | null;
  /** Extra text: who joined or left, what changed, or the organizer's reason. */
  body: string | null;
  createdAt: string;
  read: boolean;
}

/** GET /notifications/unread-count (FR42). */
export interface UnreadCountDto {
  count: number;
}

/**
 * Sent by requests the app makes on its own (e.g. polling the unread count), so they don't
 * count as activity for the 30-minute idle timeout (FR10, open question Q27).
 */
export const BACKGROUND_REFRESH_HEADER = 'X-Background-Refresh';
