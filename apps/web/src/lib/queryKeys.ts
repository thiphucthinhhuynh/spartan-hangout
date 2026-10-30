/**
 * Every TanStack Query key in one place, so mutations can invalidate the right queries.
 * Feature milestones add their keys here (e.g. `activity(id)`, `activities.recommended`).
 */
export const queryKeys = {
  health: ['health'] as const,
  /** The logged-in student, or null when signed out. */
  me: ['me'] as const,
  /** The logged-in student's full profile (GET /users/me). */
  myProfile: ['profile', 'me'] as const,
  /** Another student's public profile (GET /users/:id). */
  student: (id: string) => ['profile', 'student', id] as const,
  /** One activity's detail (GET /activities/:id). */
  activity: (id: string) => ['activity', id] as const,
  /** One activity's participants (GET /activities/:id/participants); refreshed with the activity. */
  participants: (id: string) => ['activity', id, 'participants'] as const,
  /** One activity's group chat (GET /activities/:id/messages). */
  chat: (id: string) => ['activity', id, 'chat'] as const,
  /** Every activity list; invalidate this after creating or editing an activity. */
  activities: ['activities'] as const,
  /** The Recommended list (GET /activities/recommended). */
  recommended: ['activities', 'recommended'] as const,
  /** Search results for one set of criteria (GET /activities). */
  activitySearch: (criteria: object) => ['activities', 'search', criteria] as const,
  /** My plans (GET /activities/mine). */
  myActivities: (role: string, when: string) => ['activities', 'mine', role, when] as const,
  /** Every notification query; invalidate after marking one read. */
  notifications: ['notifications'] as const,
  /** The bell's badge (GET /notifications/unread-count). */
  unreadCount: ['notifications', 'unread-count'] as const,
  /** The notification list (GET /notifications). */
  notificationList: ['notifications', 'list'] as const,
};
