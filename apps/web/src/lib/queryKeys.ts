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
};
