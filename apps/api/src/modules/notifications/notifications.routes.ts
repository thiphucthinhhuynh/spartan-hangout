import { paginationSchema } from '@sh/shared';
import { Router } from 'express';
import { requireAuth } from '../../common/auth.js';
import { validate } from '../../common/validate.js';
import type { AppDeps } from '../../deps.js';
import { createNotificationsController } from './notifications.controller.js';
import { createNotificationsService } from './notifications.service.js';

/** /api/v1/notifications — docs/api.md#notifications-module-fr40fr42 */
export function createNotificationsRouter(deps: AppDeps) {
  const controller = createNotificationsController(createNotificationsService(deps));
  const router = Router();
  router.use(requireAuth);

  router.get('/', validate({ query: paginationSchema }), controller.list);
  router.get('/unread-count', controller.unreadCount);
  router.post('/:id/read', controller.markRead);

  return router;
}
