import type { MessageInput, MessageListInput } from '@sh/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../../common/auth.js';
import { NotFoundError } from '../../common/errors.js';
import type { ConversationsService } from './conversations.service.js';

const idSchema = z.uuid();

/** A malformed id in the URL is simply a student who doesn't exist. */
function otherUserId(raw: unknown): string {
  const id = idSchema.safeParse(raw);
  if (!id.success) throw new NotFoundError('We couldn’t find that student.');
  return id.data;
}

// Bodies and queries are already parsed by validate() in messages.routes.ts.
export function createConversationsController(service: ConversationsService) {
  const list: RequestHandler = async (req, res) => {
    res.json(await service.list(currentUser(req).id));
  };

  const thread: RequestHandler = async (req, res) => {
    const { after } = req.query as unknown as MessageListInput;
    res.json(await service.thread(currentUser(req).id, otherUserId(req.params.userId), after));
  };

  const send: RequestHandler = async (req, res) => {
    const { body } = req.body as MessageInput;
    res
      .status(201)
      .json(await service.send(currentUser(req), otherUserId(req.params.userId), body));
  };

  return { list, thread, send };
}
