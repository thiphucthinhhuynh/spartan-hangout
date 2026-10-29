/** Base path of every API route. */
export const API_PREFIX = '/api/v1';

/** All dates and times are shown in SJSU's time zone (ADR-0011). */
export const CAMPUS_TIME_ZONE = 'America/Los_Angeles';

/** Field and behavior limits taken from the functional requirements (FR02–FR53). */
export const LIMITS = {
  displayName: { min: 1, max: 50 }, // FR02
  passwordMinLength: 8, // FR02
  activityTitle: { min: 1, max: 100 }, // FR26
  activityDescription: { min: 1, max: 500 }, // FR26
  activityLocation: { min: 1, max: 100 }, // FR26
  participantLimit: { min: 2, max: 100 }, // FR26
  reasonMaxLength: 200, // FR31, FR33
  messageBody: { min: 1, max: 500 }, // FR36, FR38, FR47
  reportDescriptionMaxLength: 500, // FR51
  verificationLinkHours: 24, // FR03
  sessionIdleMinutes: 30, // FR10
  lockout: { attempts: 5, windowMinutes: 15, lockMinutes: 15 }, // FR11
  pageSize: { default: 20, max: 50 }, // docs/api.md: lists
} as const;
