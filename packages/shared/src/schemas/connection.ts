import { z } from 'zod';

/** POST /connections/requests (FR45). */
export const connectionRequestSchema = z.object({
  recipientId: z.uuid('Choose a student.'),
});
export type ConnectionRequestInput = z.infer<typeof connectionRequestSchema>;

export const REQUEST_DIRECTIONS = ['incoming', 'outgoing'] as const;

/** GET /connections/requests */
export const connectionRequestListSchema = z.object({
  direction: z.enum(REQUEST_DIRECTIONS).default('incoming'),
});
export type ConnectionRequestListInput = z.infer<typeof connectionRequestListSchema>;
