import { z } from 'zod';
import { LIMITS } from '../constants.js';
import { paginationSchema } from './activitySearch.js';

/**
 * An optional reason of up to 200 characters, shown to the affected students: removals (FR33)
 * and cancellations (FR31). The body may be missing.
 */
export const optionalReasonSchema = z.preprocess(
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
export type OptionalReasonInput = z.infer<typeof optionalReasonSchema>;

/** DELETE /activities/:id/participants/:userId (FR33). */
export const removeParticipantSchema = optionalReasonSchema;
export type RemoveParticipantInput = OptionalReasonInput;

/** POST /activities/:id/cancel (FR31). */
export const cancelActivitySchema = optionalReasonSchema;
export type CancelActivityInput = OptionalReasonInput;

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
