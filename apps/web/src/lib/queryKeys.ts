/**
 * Every TanStack Query key in one place, so mutations can invalidate the right queries.
 * Feature milestones add their keys here (e.g. `activity(id)`, `activities.recommended`).
 */
export const queryKeys = {
  health: ['health'] as const,
  /** The logged-in student, or null when signed out. */
  me: ['me'] as const,
};
