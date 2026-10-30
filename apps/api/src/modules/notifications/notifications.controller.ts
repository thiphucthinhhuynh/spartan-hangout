import type { PaginationInput, UnreadCountDto } from '@sh/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../../common/auth.js';
import { NotFoundError } from '../../common/errors.js';
import type { NotificationsService } from './notifications.service.js';

const idSchema = z.uuid();

// Queries are already parsed by validate() in notifications.routes.ts.
export function createNotificationsController(service: NotificationsService) {
  const list: RequestHandler = async (req, res) => {
    res.json(await service.list(currentUser(req).id, req.query as unknown as PaginationInput));
  };

  const unreadCount: RequestHandler = async (req, res) => {
    res.json({ count: await service.unreadCount(currentUser(req).id) } satisfies UnreadCountDto);
  };

  const markRead: RequestHandler = async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) throw new NotFoundError('We couldn’t find that notification.');
    await service.markRead(currentUser(req).id, id.data);
    res.status(204).end();
  };

  return { list, unreadCount, markRead };
}
