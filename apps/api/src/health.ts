import type { RequestHandler } from 'express';
import { db } from './db.js';

/** GET /api/v1/health — liveness plus a database round trip, for CI and hosting checks. */
export const healthHandler: RequestHandler = async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Health check: database unreachable:', err);
    res.status(503).json({ status: 'unavailable' });
  }
};
