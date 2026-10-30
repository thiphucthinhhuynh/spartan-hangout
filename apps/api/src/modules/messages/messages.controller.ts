import type { MessageInput, MessageListInput } from '@sh/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../../common/auth.js';
import { NotFoundError } from '../../common/errors.js';
import type { MessagesService } from './messages.service.js';

const idSchema = z.uuid();

/** A malformed id in the URL is simply an activity that doesn't exist. */
function activityId(raw: unknown): string {
  const id = idSchema.safeParse(raw);
  if (!id.success) throw new NotFoundError('We couldn’t find that activity.');
  return id.data;
}

// Bodies and queries are already parsed by validate() in messages.routes.ts.
export function createMessagesController(service: MessagesService) {
  const list: RequestHandler = async (req, res) => {
    const { after } = req.query as unknown as MessageListInput;
    res.json(await service.list(currentUser(req).id, activityId(req.params.id), after));
  };

  const send: RequestHandler = async (req, res) => {
    const { body } = req.body as MessageInput;
    res.status(201).json(await service.send(currentUser(req).id, activityId(req.params.id), body));
  };

  const postUpdate: RequestHandler = async (req, res) => {
    const { body } = req.body as MessageInput;
    res
      .status(201)
      .json(await service.postUpdate(currentUser(req).id, activityId(req.params.id), body));
  };

  return { list, send, postUpdate };
}
