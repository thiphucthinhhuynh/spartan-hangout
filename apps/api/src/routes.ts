import { Router } from 'express';
import type { AppDeps } from './deps.js';
import { healthHandler } from './health.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';

/** Every route under /api/v1. Feature modules register their routers here as they are built. */
export function createApiRouter(deps: AppDeps) {
  const router = Router();

  router.get('/health', healthHandler);
  router.use('/auth', createAuthRouter(deps));

  return router;
}
