import { z } from 'zod';
import { LIMITS } from '../constants.js';
import { paginationSchema } from './activitySearch.js';

/** DELETE /activities/:id/participants/:userId (FR33): an optional reason for the student. */
export const removeParticipantSchema = z.preprocess(
  // A DELETE request may have no body at all.
  (body) => body ?? {},
  z.object({
    reason: z
      .string()
      .trim()
      .max(LIMITS.reasonMaxLength, `Reason must be ${LIMITS.reasonMaxLength} characters or fewer.`)
      .transform((text) => text || undefined)
      .optional(),
  }),
);
export type RemoveParticipantInput = z.infer<typeof removeParticipantSchema>;

export const MY_ACTIVITY_ROLES = ['joined', 'organizing'] as const;
export const MY_ACTIVITY_TIMES = ['upcoming', 'past'] as const;

/**
 * GET /activities/mine ("My plans"). Upcoming: Open or Full and not ended, soonest first.
 * Past: ended, Completed or Cancelled, most recent first.
 */
export const myActivitiesSchema = paginationSchema.extend({
  role: z.enum(MY_ACTIVITY_ROLES).default('joined'),
  when: z.enum(MY_ACTIVITY_TIMES).default('upcoming'),
});
export type MyActivitiesInput = z.infer<typeof myActivitiesSchema>;
