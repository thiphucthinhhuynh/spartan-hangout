import { z } from 'zod';
import { LIMITS } from '../constants.js';

const { messageBody } = LIMITS;

/**
 * Group chat messages and organizer updates (FR36, FR38); direct messages reuse it (FR47).
 * Trimmed first, so whitespace-only text counts as empty (open question Q18).
 */
export const messageSchema = z.object({
  body: z
    .string({ error: 'Write a message.' })
    .trim()
    .min(messageBody.min, 'Write a message.')
    .max(messageBody.max, `Messages must be ${messageBody.max} characters or fewer.`),
});
export type MessageInput = z.infer<typeof messageSchema>;

/** GET /activities/:id/messages: `after` returns only messages newer than that one (polling). */
export const messageListSchema = z.object({
  after: z.preprocess((value) => (value === '' ? undefined : value), z.uuid().optional()),
});
export type MessageListInput = z.infer<typeof messageListSchema>;
