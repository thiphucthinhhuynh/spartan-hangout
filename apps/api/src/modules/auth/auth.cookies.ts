import { LIMITS } from '@sh/shared';
import type { CookieOptions, Response } from 'express';
import { MINUTE_MS } from '../../common/time.js';

export const SESSION_COOKIE = 'sh_sid';

function options(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}

/** The cookie lives as long as the idle window and is renewed when the session is used. */
export function setSessionCookie(res: Response, token: string, secure: boolean) {
  res.cookie(SESSION_COOKIE, token, {
    ...options(secure),
    maxAge: LIMITS.sessionIdleMinutes * MINUTE_MS,
  });
}

export function clearSessionCookie(res: Response, secure: boolean) {
  res.clearCookie(SESSION_COOKIE, options(secure));
}
