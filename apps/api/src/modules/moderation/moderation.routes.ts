import { blockSchema, reportListSchema, reportSchema } from '@sh/shared';
import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../common/auth.js';
import { validate } from '../../common/validate.js';
import type { AppDeps } from '../../deps.js';
import { createActivityService } from '../activities/activity.service.js';
import { createParticipationService } from '../activities/participation.service.js';
import { createConnectionsService } from '../connections/connections.service.js';
import { createBlocksService } from './blocks.service.js';
import { createModerationController } from './moderation.controller.js';
import { createReportsService } from './reports.service.js';

/** /api/v1/reports, /api/v1/blocks and /api/v1/admin — docs/api.md#moderation-module-fr50fr57 */
export function createModerationRouters(deps: AppDeps) {
  const activities = createActivityService(deps);
  const controller = createModerationController(
    createReportsService(deps, activities),
    createBlocksService(
      deps,
      createConnectionsService(deps),
      createParticipationService(deps, activities),
    ),
  );

  const reports = Router();
  reports.use(requireAuth);
  reports.post('/', validate({ body: reportSchema }), controller.submitReport);

  const blocks = Router();
  blocks.use(requireAuth);
  blocks.post('/', validate({ body: blockSchema }), controller.blockStudent);

  // FR53: only Administrators.
  const admin = Router();
  admin.use(requireAdmin);
  admin.get('/reports', validate({ query: reportListSchema }), controller.listReports);
  admin.post('/reports/:id/review', controller.reviewReport);

  return { reports, blocks, admin };
}
