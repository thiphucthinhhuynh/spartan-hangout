import { connectionRequestListSchema, connectionRequestSchema, paginationSchema } from '@sh/shared';
import { Router } from 'express';
import { requireAuth } from '../../common/auth.js';
import { validate } from '../../common/validate.js';
import type { AppDeps } from '../../deps.js';
import { createConnectionsController } from './connections.controller.js';
import { createConnectionsService } from './connections.service.js';

/** /api/v1/connections — docs/api.md#connections-module-fr43fr46 */
export function createConnectionsRouter(deps: AppDeps) {
  const controller = createConnectionsController(createConnectionsService(deps));
  const router = Router();
  router.use(requireAuth);

  router.get('/', validate({ query: paginationSchema }), controller.connections);
  router.get('/discover', validate({ query: paginationSchema }), controller.discover);
  router.get(
    '/requests',
    validate({ query: connectionRequestListSchema }),
    controller.listRequests,
  );
  router.post('/requests', validate({ body: connectionRequestSchema }), controller.sendRequest);
  router.post('/requests/:id/accept', controller.accept);
  router.post('/requests/:id/decline', controller.decline);

  return router;
}
