import { z } from 'zod';
import { LIMITS } from '../constants.js';
import { ReportReason, ReportStatus } from '../enums.js';
import { paginationSchema } from './activitySearch.js';

const { reportDescriptionMaxLength } = LIMITS;

/** POST /reports (FR50–FR51): exactly one target, a reason from the list, an optional description. */
export const reportSchema = z
  .object({
    targetUserId: z.uuid().optional(),
    targetActivityId: z.uuid().optional(),
    reason: z.enum(ReportReason, { error: 'Choose a reason.' }),
    description: z
      .string()
      .trim()
      .max(
        reportDescriptionMaxLength,
        `Description must be ${reportDescriptionMaxLength} characters or fewer.`,
      )
      .transform((text) => text || undefined)
      .optional(),
  })
  .refine((report) => !report.targetUserId !== !report.targetActivityId, {
    error: 'Report one student or one activity.',
    path: ['target'],
  });
export type ReportInput = z.infer<typeof reportSchema>;

/** GET /admin/reports (FR53) */
export const reportListSchema = paginationSchema.extend({
  status: z.enum(ReportStatus).optional(),
});
export type ReportListInput = z.infer<typeof reportListSchema>;
