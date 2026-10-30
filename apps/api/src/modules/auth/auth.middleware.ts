import { BACKGROUND_REFRESH_HEADER } from '@sh/shared';
import type { RequestHandler } from 'express';
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from './auth.cookies.js';
import type { SessionService } from './session.service.js';

/**
 * Attaches `req.user` when the request carries a live session cookie (FR10). Requests the app
 * makes on its own (polling) are still checked against the idle timeout but don't extend it
 * (open question Q27, option a).
 */
export function createSessionMiddleware(sessions: SessionService, secure: boolean): RequestHandler {
  return async (req, res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token === '') return next();

    const background = req.get(BACKGROUND_REFRESH_HEADER) === '1';
    const session = await sessions.resolve(token, { touch: !background });
    if (!session) {
      clearSessionCookie(res, secure);
      return next();
    }

    req.user = session.user;
    req.sessionToken = token;
    if (session.refreshed) setSessionCookie(res, token, secure);
    next();
  };
}
