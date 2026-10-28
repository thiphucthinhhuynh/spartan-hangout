import { Role } from '@sh/shared';
import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthenticatedError } from './errors.js';

/** The logged-in student, attached to the request by the session middleware (auth module). */
export interface AuthUser {
  id: string;
  displayName: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    /** Raw session token from the cookie, for logout. */
    sessionToken?: string;
  }
}

/** FR10: every feature except registration and login requires a logged-in student. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  next(req.user ? undefined : new UnauthenticatedError());
};

/** FR53: only Administrators can access reports. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new UnauthenticatedError());
  next(req.user.role === Role.ADMIN ? undefined : new ForbiddenError());
};

/** For handlers behind requireAuth: the logged-in user, or a 401 if the route was misconfigured. */
export function currentUser(req: { user?: AuthUser | undefined }): AuthUser {
  if (!req.user) throw new UnauthenticatedError();
  return req.user;
}
