import { deleteAccountSchema, profileUpdateSchema } from '@sh/shared';
import { Router } from 'express';
import { requireAuth } from '../../common/auth.js';
import { validate } from '../../common/validate.js';
import type { AppDeps } from '../../deps.js';
import { createActivityService } from '../activities/activity.service.js';
import { createParticipationService } from '../activities/participation.service.js';
import { createUsersController } from './users.controller.js';
import { createUsersService } from './users.service.js';

/** /api/v1/users — docs/api.md#users-module-fr05fr08-fr12fr13 */
export function createUsersRouter(deps: AppDeps) {
  const activities = createActivityService(deps);
  const controller = createUsersController(
    createUsersService(deps, activities, createParticipationService(deps, activities)),
    deps.secureCookies,
  );
  const router = Router();
  router.use(requireAuth);

  // /me is registered before /:id so it is never read as an id.
  router.get('/me', controller.getMe);
  router.patch('/me', validate({ body: profileUpdateSchema }), controller.updateMe);
  router.delete('/me', validate({ body: deleteAccountSchema }), controller.deleteMe);
  router.get('/:id', controller.getById);

  return router;
}
