import { z } from 'zod';
import { LIMITS } from '../constants.js';
import { ActivityType } from '../enums.js';
import { DATE_PATTERN, TIME_OF_DAY_PATTERN } from '../time.js';

const { activityLocation, pageSize } = LIMITS;

/** An empty query-string value (e.g. `?location=`) means "no criterion". */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}

/** `?page=1&pageSize=20` on every list (docs/api.md: "Lists"). */
export const paginationSchema = z.object({
  page: optional(z.coerce.number().int().min(1, 'Page must be 1 or more.')).default(1),
  pageSize: optional(
    z.coerce
      .number()
      .int()
      .min(1, 'Page size must be 1 or more.')
      .max(pageSize.max, `Page size can be at most ${pageSize.max}.`),
  ).default(pageSize.default),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * GET /activities (FR16): any combination of criteria, all applied together. Dates and times are
 * campus-local (ADR-0011); both ends of each range are included.
 */
export const activitySearchSchema = paginationSchema
  .extend({
    type: optional(z.enum(ActivityType, { error: 'Choose a category.' })),
    fromDate: optional(z.string().regex(DATE_PATTERN, 'Enter a valid date.')),
    toDate: optional(z.string().regex(DATE_PATTERN, 'Enter a valid date.')),
    earliestStart: optional(z.string().regex(TIME_OF_DAY_PATTERN, 'Enter a valid time.')),
    latestStart: optional(z.string().regex(TIME_OF_DAY_PATTERN, 'Enter a valid time.')),
    location: optional(
      z
        .string()
        .trim()
        .max(activityLocation.max, `Location must be ${activityLocation.max} characters or fewer.`)
        .transform((text) => text || undefined),
    ),
  })
  // "YYYY-MM-DD" and "HH:mm" strings compare correctly as text.
  .refine((s) => !s.fromDate || !s.toDate || s.fromDate <= s.toDate, {
    error: 'The end date must be on or after the start date.',
    path: ['toDate'],
  })
  .refine((s) => !s.earliestStart || !s.latestStart || s.earliestStart <= s.latestStart, {
    error: 'The latest start must be at or after the earliest start.',
    path: ['latestStart'],
  });
export type ActivitySearchInput = z.infer<typeof activitySearchSchema>;

/** The search criteria alone, without paging. */
export type ActivitySearchCriteria = Omit<ActivitySearchInput, 'page' | 'pageSize'>;
