import type { ProfileUpdateInput } from '@sh/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../../common/auth.js';
import { NotFoundError } from '../../common/errors.js';
import type { UsersService } from './users.service.js';

const userIdSchema = z.uuid();

export function createUsersController(service: UsersService) {
  const getMe: RequestHandler = async (req, res) => {
    res.json(await service.getOwnProfile(currentUser(req).id));
  };

  const updateMe: RequestHandler = async (req, res) => {
    res.json(await service.updateOwnProfile(currentUser(req).id, req.body as ProfileUpdateInput));
  };

  const getById: RequestHandler = async (req, res) => {
    // A malformed id in the URL is simply a student that doesn't exist.
    const id = userIdSchema.safeParse(req.params.id);
    if (!id.success) throw new NotFoundError('We couldn’t find that student.');
    res.json(await service.getPublicProfile(currentUser(req).id, id.data));
  };

  return { getMe, updateMe, getById };
}
