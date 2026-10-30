import type {
  ConnectionRequestInput,
  ConnectionRequestListInput,
  PaginationInput,
} from '@sh/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../../common/auth.js';
import { NotFoundError } from '../../common/errors.js';
import type { ConnectionsService } from './connections.service.js';

const idSchema = z.uuid();

function requestId(raw: unknown): string {
  const id = idSchema.safeParse(raw);
  if (!id.success) throw new NotFoundError('We couldn’t find that connection request.');
  return id.data;
}

// Bodies and queries are already parsed by validate() in connections.routes.ts.
export function createConnectionsController(service: ConnectionsService) {
  const discover: RequestHandler = async (req, res) => {
    res.json(await service.discover(currentUser(req).id, req.query as unknown as PaginationInput));
  };

  const connections: RequestHandler = async (req, res) => {
    const paging = req.query as unknown as PaginationInput;
    res.json(await service.connections(currentUser(req).id, paging));
  };

  const sendRequest: RequestHandler = async (req, res) => {
    const { recipientId } = req.body as ConnectionRequestInput;
    res.status(201).json(await service.sendRequest(currentUser(req), recipientId));
  };

  const listRequests: RequestHandler = async (req, res) => {
    const { direction } = req.query as unknown as ConnectionRequestListInput;
    res.json(await service.listRequests(currentUser(req).id, direction));
  };

  const accept: RequestHandler = async (req, res) => {
    await service.accept(currentUser(req), requestId(req.params.id));
    res.status(204).end();
  };

  const decline: RequestHandler = async (req, res) => {
    await service.decline(currentUser(req).id, requestId(req.params.id));
    res.status(204).end();
  };

  return { discover, connections, sendRequest, listRequests, accept, decline };
}
