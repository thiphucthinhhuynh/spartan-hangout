/**
 * Every TanStack Query key in one place, so mutations can invalidate the right queries.
 * Feature milestones add their keys here (e.g. `me`, `activity(id)`, `activities.recommended`).
 */
export const queryKeys = {
  health: ['health'] as const,
};
