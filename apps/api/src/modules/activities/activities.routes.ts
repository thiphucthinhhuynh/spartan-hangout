import {
  activityCreateSchema,
  activitySearchSchema,
  cancelActivitySchema,
  activityUpdateSchema,
  myActivitiesSchema,
  paginationSchema,
  removeParticipantSchema,
} from '@sh/shared';
import { Router } from 'express';
import { requireAuth } from '../../common/auth.js';
import { validate } from '../../common/validate.js';
import type { AppDeps } from '../../deps.js';
import { createActivitiesController } from './activities.controller.js';
import { createActivityService } from './activity.service.js';
import { createParticipationService } from './participation.service.js';

/** /api/v1/activities — docs/api.md#activities-module-activities-fr14fr18-fr20-fr26fr32 */
export function createActivitiesRouter(deps: AppDeps) {
  const activities = createActivityService(deps);
  const controller = createActivitiesController(
    activities,
    createParticipationService(deps, activities),
  );
  const router = Router();
  router.use(requireAuth);

  // Fixed paths (/recommended, /mine) are registered before /:id.
  router.get('/', validate({ query: activitySearchSchema }), controller.search);
  router.get('/recommended', validate({ query: paginationSchema }), controller.recommended);
  router.get('/mine', validate({ query: myActivitiesSchema }), controller.mine);
  router.post('/', validate({ body: activityCreateSchema }), controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', validate({ body: activityUpdateSchema }), controller.update);
  router.post('/:id/cancel', validate({ body: cancelActivitySchema }), controller.cancel);

  // Participation (FR19, FR21–FR25, FR33–FR34).
  router.get('/:id/participants', controller.participants);
  router.post('/:id/join', controller.join);
  router.post('/:id/leave', controller.leave);
  router.delete(
    '/:id/participants/:userId',
    validate({ body: removeParticipantSchema }),
    controller.removeParticipant,
  );

  return router;
}
