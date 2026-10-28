import { activityCreateSchema, activityUpdateSchema } from '@sh/shared';
import { Router } from 'express';
import { requireAuth } from '../../common/auth.js';
import { validate } from '../../common/validate.js';
import type { AppDeps } from '../../deps.js';
import { createActivitiesController } from './activities.controller.js';
import { createActivityService } from './activity.service.js';

/** /api/v1/activities — docs/api.md#activities-module-activities-fr14fr18-fr20-fr26fr32 */
export function createActivitiesRouter(deps: AppDeps) {
  const controller = createActivitiesController(createActivityService(deps));
  const router = Router();
  router.use(requireAuth);

  // Search (GET /), /recommended (M5) and /mine (M6) are registered here before /:id.
  router.post('/', validate({ body: activityCreateSchema }), controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', validate({ body: activityUpdateSchema }), controller.update);

  return router;
}
