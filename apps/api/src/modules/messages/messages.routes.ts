import { messageListSchema, messageSchema } from '@sh/shared';
import { Router } from 'express';
import { requireAuth } from '../../common/auth.js';
import { validate } from '../../common/validate.js';
import type { AppDeps } from '../../deps.js';
import { createActivityService } from '../activities/activity.service.js';
import { createConversationsController } from './conversations.controller.js';
import { createConversationsService } from './conversations.service.js';
import { createMessagesController } from './messages.controller.js';
import { createMessagesService } from './messages.service.js';

/**
 * /api/v1/activities/:id/{messages,updates} — docs/api.md#messages-module-activity-chat-and-updates-fr35fr39
 * Mounted before the activities router; anything else under /activities/:id falls through to it.
 */
export function createActivityChatRouter(deps: AppDeps) {
  const controller = createMessagesController(
    createMessagesService(deps, createActivityService(deps)),
  );
  const router = Router({ mergeParams: true });

  router.get('/messages', requireAuth, validate({ query: messageListSchema }), controller.list);
  router.post('/messages', requireAuth, validate({ body: messageSchema }), controller.send);
  router.post('/updates', requireAuth, validate({ body: messageSchema }), controller.postUpdate);

  return router;
}

/** /api/v1/conversations — docs/api.md#messages-module-direct-messages-fr47fr49 */
export function createConversationsRouter(deps: AppDeps) {
  const controller = createConversationsController(createConversationsService(deps));
  const router = Router();
  router.use(requireAuth);

  router.get('/', controller.list);
  router.get('/:userId/messages', validate({ query: messageListSchema }), controller.thread);
  router.post('/:userId/messages', validate({ body: messageSchema }), controller.send);

  return router;
}
