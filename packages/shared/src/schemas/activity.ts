import { z } from 'zod';
import { LIMITS } from '../constants.js';
import { ActivityType } from '../enums.js';
import { DATE_PATTERN, TIME_OF_DAY_PATTERN } from '../time.js';

const { activityTitle, activityDescription, activityLocation, participantLimit } = LIMITS;

/**
 * The fields of an activity as the student enters them (FR26). Date and times are campus-local
 * (ADR-0011); the API converts them to UTC instants.
 */
export const activityFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(activityTitle.min, 'Enter a title.')
    .max(activityTitle.max, `Title must be ${activityTitle.max} characters or fewer.`),
  description: z
    .string()
    .trim()
    .min(activityDescription.min, 'Describe the activity.')
    .max(
      activityDescription.max,
      `Description must be ${activityDescription.max} characters or fewer.`,
    ),
  type: z.enum(ActivityType, { error: 'Choose a category.' }),
  date: z.string().regex(DATE_PATTERN, 'Choose a date.'),
  startTime: z.string().regex(TIME_OF_DAY_PATTERN, 'Choose a start time.'),
  endTime: z.string().regex(TIME_OF_DAY_PATTERN, 'Choose an end time.'),
  location: z
    .string()
    .trim()
    .min(activityLocation.min, 'Enter a location.')
    .max(activityLocation.max, `Location must be ${activityLocation.max} characters or fewer.`),
  participantLimit: z
    .number({ error: 'Enter a participant limit.' })
    .int('The participant limit must be a whole number.')
    .min(participantLimit.min, `The limit must be at least ${participantLimit.min}, including you.`)
    .max(participantLimit.max, `The limit can be at most ${participantLimit.max}.`),
});

/**
 * POST /activities (FR26–FR27). "Start in the future" depends on the clock, so the API checks it
 * (and forms check it with `isStartInFuture` for quick feedback).
 */
export const activityCreateSchema = activityFieldsSchema.refine(
  // FR27: same date (there is one date field), and "HH:mm" strings compare correctly as text.
  (activity) => activity.endTime > activity.startTime,
  { error: 'End time must be later than the start time.', path: ['endTime'] },
);
export type ActivityCreateInput = z.infer<typeof activityCreateSchema>;

/**
 * PATCH /activities/:id (FR29–FR30): any of the fields. The API merges them into the current
 * activity and validates the result with `activityCreateSchema`, the same rules as creation.
 */
export const activityUpdateSchema = activityFieldsSchema
  .partial()
  .refine((update) => Object.keys(update).length > 0, 'Change at least one field.');
export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;

export const START_IN_PAST_MESSAGE = 'The start time must be in the future.';
