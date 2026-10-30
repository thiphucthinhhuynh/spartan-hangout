import { NotificationType, type NotificationDto } from '@sh/shared';

export interface NotificationView {
  /** One line saying what happened. */
  title: string;
  /** Extra detail (a reason, what changed), if any. */
  detail: string | null;
  /** Where opening it goes (FR42), or null when there is nothing to open. */
  link: string | null;
}

/** How each notification reads in the list (FR40–FR42). */
export function describeNotification(n: NotificationDto): NotificationView {
  const activity = n.activityTitle ?? 'an activity';
  const activityLink = n.activityId ? `/activities/${n.activityId}` : null;
  const reason = n.body ? `Reason: ${n.body}` : null;

  switch (n.type) {
    case NotificationType.ACTIVITY_CHANGED:
      return { title: `${activity} was changed`, detail: n.body, link: activityLink };
    case NotificationType.ACTIVITY_CANCELLED:
      return { title: `${activity} was cancelled`, detail: reason, link: activityLink };
    case NotificationType.ACTIVITY_UPDATE:
      return { title: `Update in ${activity}`, detail: n.body, link: activityLink };
    case NotificationType.REMOVED_FROM_ACTIVITY:
      return { title: `You were removed from ${activity}`, detail: reason, link: activityLink };
    case NotificationType.PARTICIPANT_JOINED:
    case NotificationType.PARTICIPANT_LEFT:
      // The body names the student: "Sammy Spartan joined."
      return {
        title: n.body ?? 'Someone changed their plans',
        detail: activity,
        link: activityLink,
      };
    case NotificationType.DIRECT_MESSAGE:
      return {
        title: 'New message',
        detail: n.body,
        link: n.conversationUserId ? `/inbox/${n.conversationUserId}` : null,
      };
    default:
      // Connection notifications arrive in Milestone 9 (open question Q17).
      return { title: n.body ?? 'New notification', detail: null, link: activityLink };
  }
}
