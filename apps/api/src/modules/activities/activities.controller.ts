import type { ActivityCreateInput, ActivityUpdateInput } from '@sh/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../../common/auth.js';
import { NotFoundError } from '../../common/errors.js';
import type { ActivityService } from './activity.service.js';

const activityIdSchema = z.uuid();

/** A malformed id in the URL is simply an activity that doesn't exist. */
function activityId(raw: unknown): string {
  const id = activityIdSchema.safeParse(raw);
  if (!id.success) throw new NotFoundError('We couldn’t find that activity.');
  return id.data;
}

export function createActivitiesController(service: ActivityService) {
  const create: RequestHandler = async (req, res) => {
    res
      .status(201)
      .json(await service.create(currentUser(req).id, req.body as ActivityCreateInput));
  };

  const getById: RequestHandler = async (req, res) => {
    res.json(await service.getDetail(currentUser(req).id, activityId(req.params.id)));
  };

  const update: RequestHandler = async (req, res) => {
    const patch = req.body as ActivityUpdateInput;
    res.json(await service.update(currentUser(req).id, activityId(req.params.id), patch));
  };

  return { create, getById, update };
}
