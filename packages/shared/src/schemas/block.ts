import { z } from 'zod';

/** POST /blocks (FR54). */
export const blockSchema = z.object({
  userId: z.uuid('Choose a student.'),
});
export type BlockInput = z.infer<typeof blockSchema>;
