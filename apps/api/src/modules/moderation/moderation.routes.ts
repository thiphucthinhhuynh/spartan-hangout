import { reportListSchema, reportSchema } from '@sh/shared';
import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../common/auth.js';
import { validate } from '../../common/validate.js';
import type { AppDeps } from '../../deps.js';
import { createActivityService } from '../activities/activity.service.js';
import { createModerationController } from './moderation.controller.js';
import { createReportsService } from './reports.service.js';

/** /api/v1/reports and /api/v1/admin — docs/api.md#moderation-module-fr50fr57 */
export function createModerationRouters(deps: AppDeps) {
  const controller = createModerationController(
    createReportsService(deps, createActivityService(deps)),
  );

  const reports = Router();
  reports.use(requireAuth);
  reports.post('/', validate({ body: reportSchema }), controller.submitReport);

  // FR53: only Administrators.
  const admin = Router();
  admin.use(requireAdmin);
  admin.get('/reports', validate({ query: reportListSchema }), controller.listReports);
  admin.post('/reports/:id/review', controller.reviewReport);

  return { reports, admin };
}
