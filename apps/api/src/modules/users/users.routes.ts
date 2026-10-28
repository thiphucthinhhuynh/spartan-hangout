import { profileUpdateSchema } from '@sh/shared';
import { Router } from 'express';
import { requireAuth } from '../../common/auth.js';
import { validate } from '../../common/validate.js';
import type { AppDeps } from '../../deps.js';
import { createUsersController } from './users.controller.js';
import { createUsersService } from './users.service.js';

/** /api/v1/users — docs/api.md#users-module-fr05fr08-fr12fr13 */
export function createUsersRouter(deps: AppDeps) {
  const controller = createUsersController(createUsersService(deps));
  const router = Router();
  router.use(requireAuth);

  // /me is registered before /:id so it is never read as an id.
  router.get('/me', controller.getMe);
  router.patch('/me', validate({ body: profileUpdateSchema }), controller.updateMe);
  router.get('/:id', controller.getById);

  return router;
}
