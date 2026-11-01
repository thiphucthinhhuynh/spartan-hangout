import type { ReportInput, ReportListInput } from '@sh/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../../common/auth.js';
import { NotFoundError } from '../../common/errors.js';
import type { ReportsService } from './reports.service.js';

const idSchema = z.uuid();

// Bodies and queries are already parsed by validate() in moderation.routes.ts.
export function createModerationController(reports: ReportsService) {
  const submitReport: RequestHandler = async (req, res) => {
    res.status(201).json(await reports.submit(currentUser(req).id, req.body as ReportInput));
  };

  const listReports: RequestHandler = async (req, res) => {
    res.json(await reports.list(req.query as unknown as ReportListInput));
  };

  const reviewReport: RequestHandler = async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) throw new NotFoundError('We couldn’t find that report.');
    res.json(await reports.markReviewed(currentUser(req).id, id.data));
  };

  return { submitReport, listReports, reviewReport };
}
