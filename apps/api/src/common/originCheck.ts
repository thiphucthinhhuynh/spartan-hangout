import type { RequestHandler } from 'express';
import { ForbiddenError } from './errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense (architecture §13): together with SameSite=Lax cookies and JSON-only bodies,
 * reject state-changing requests that a browser says came from another site.
 * Requests without an Origin header (curl, tests) are not browser cross-site requests.
 */
export function originCheck(appOrigin: string): RequestHandler {
  const allowed = new URL(appOrigin).origin;
  return (req, _res, next) => {
    const origin = req.get('origin');
    if (SAFE_METHODS.has(req.method) || !origin || origin === allowed) return next();
    next(new ForbiddenError('Requests from other sites are not allowed.'));
  };
}
