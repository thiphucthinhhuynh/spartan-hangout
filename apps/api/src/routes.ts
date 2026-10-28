import { Router } from 'express';
import type { AppDeps } from './deps.js';
import { healthHandler } from './health.js';
import { createAuthModule } from './modules/auth/auth.routes.js';
import { createUsersRouter } from './modules/users/users.routes.js';

/** Every route under /api/v1. Feature modules register their routers here as they are built. */
export function createApiRouter(deps: AppDeps) {
  const auth = createAuthModule(deps);
  const router = Router();

  // Sets req.user for every route below; routes opt in to requiring it with requireAuth.
  router.use(auth.sessionMiddleware);

  router.get('/health', healthHandler);
  router.use('/auth', auth.router);
  router.use('/users', createUsersRouter(deps));

  return router;
}
