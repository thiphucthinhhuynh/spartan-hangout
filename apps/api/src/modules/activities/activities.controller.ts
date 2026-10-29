import type {
  ActivityCreateInput,
  ActivitySearchInput,
  ActivityUpdateInput,
  PaginationInput,
} from '@sh/shared';
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

// Queries are already parsed by validate() in activities.routes.ts.
export function createActivitiesController(service: ActivityService) {
  const search: RequestHandler = async (req, res) => {
    res.json(
      await service.search(currentUser(req).id, req.query as unknown as ActivitySearchInput),
    );
  };

  const recommended: RequestHandler = async (req, res) => {
    const paging = req.query as unknown as PaginationInput;
    res.json(await service.recommended(currentUser(req).id, paging));
  };

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

  return { search, recommended, create, getById, update };
}
