import { z } from 'zod';
import { availabilitySchema, displayNameSchema, interestsSchema } from './auth.js';

/**
 * PATCH /users/me (FR05–FR06): any of the editable fields, validated with the same rules as
 * registration. The SJSU email is not editable, so an `email` key is ignored.
 */
export const profileUpdateSchema = z
  .object({
    displayName: displayNameSchema,
    interests: interestsSchema,
    availability: availabilitySchema,
  })
  .partial()
  .refine((update) => Object.keys(update).length > 0, 'Change at least one field.');
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
