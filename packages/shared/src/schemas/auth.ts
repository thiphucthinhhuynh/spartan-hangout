import { z } from 'zod';
import { LIMITS } from '../constants.js';
import { ActivityType } from '../enums.js';
import { TIME_OF_DAY_PATTERN } from '../time.js';

export const SJSU_EMAIL_DOMAIN = '@sjsu.edu';

/** FR01: trimmed, lowercased, and only @sjsu.edu addresses. */
export const sjsuEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your SJSU email address.')
  .pipe(z.email('Enter a valid email address.'))
  .refine(
    (email) => email.endsWith(SJSU_EMAIL_DOMAIN),
    'Use your @sjsu.edu email address. Only SJSU students can register.',
  );

/** FR02: at least 8 characters with at least one letter and one number. */
export const passwordSchema = z
  .string()
  .min(
    LIMITS.passwordMinLength,
    `Password must be at least ${LIMITS.passwordMinLength} characters.`,
  )
  .regex(/\p{L}/u, 'Password must contain at least one letter.')
  .regex(/\d/, 'Password must contain at least one number.');

/** FR02: 1–50 characters after trimming. */
export const displayNameSchema = z
  .string()
  .trim()
  .min(LIMITS.displayName.min, 'Enter a display name.')
  .max(
    LIMITS.displayName.max,
    `Display name must be ${LIMITS.displayName.max} characters or fewer.`,
  );

/** FR02: one or more distinct interests from the Activity Type list. */
export const interestsSchema = z
  .array(z.enum(ActivityType, { error: 'Choose interests from the listed activity types.' }))
  .min(1, 'Choose at least one interest.')
  .refine((list) => new Set(list).size === list.length, 'Each interest can be chosen only once.');

/** FR02: a day of the week, a start time, and an end time later than the start time. */
export const availabilitySlotSchema = z
  .object({
    dayOfWeek: z
      .number({ error: 'Choose a day.' })
      .int('Choose a day.')
      .min(0, 'Choose a day.')
      .max(6, 'Choose a day.'),
    start: z.string().regex(TIME_OF_DAY_PATTERN, 'Enter a start time.'),
    end: z.string().regex(TIME_OF_DAY_PATTERN, 'Enter an end time.'),
  })
  // "HH:mm" strings compare correctly as text.
  .refine((slot) => slot.end > slot.start, {
    error: 'End time must be later than the start time.',
    path: ['end'],
  });

export const availabilitySchema = z
  .array(availabilitySlotSchema)
  .min(1, 'Add at least one time you are available.');

/** POST /auth/register (FR01–FR02) */
export const registerSchema = z.object({
  email: sjsuEmailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  interests: interestsSchema,
  availability: availabilitySchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type AvailabilitySlotInput = z.infer<typeof availabilitySlotSchema>;

/** POST /auth/verify-email (FR03–FR04) */
export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, 'This verification link is missing its token.'),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/** POST /auth/resend-verification (FR03) */
export const resendVerificationSchema = z.object({
  email: sjsuEmailSchema,
});
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

/**
 * POST /auth/login (FR09). Only "is something there" checks: the password rules apply when
 * choosing a password, not when typing it, and FR09 forbids hinting which field was wrong.
 */
export const loginSchema = z.object({
  email: sjsuEmailSchema,
  password: z.string().min(1, 'Enter your password.'),
});
export type LoginInput = z.infer<typeof loginSchema>;
