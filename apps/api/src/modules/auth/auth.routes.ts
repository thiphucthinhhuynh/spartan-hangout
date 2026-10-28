import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from '@sh/shared';
import { Router } from 'express';
import { requireAuth } from '../../common/auth.js';
import { validate } from '../../common/validate.js';
import type { AppDeps } from '../../deps.js';
import { createAuthController } from './auth.controller.js';
import { createSessionMiddleware } from './auth.middleware.js';
import { createAuthService } from './auth.service.js';
import { createSessionService } from './session.service.js';

/**
 * The auth module: its router (/api/v1/auth, docs/api.md) and the session middleware that
 * every other route relies on for `req.user`.
 */
export function createAuthModule(deps: AppDeps) {
  const sessions = createSessionService(deps);
  const controller = createAuthController(
    createAuthService(deps, sessions),
    sessions,
    deps.secureCookies,
  );

  const router = Router();
  router.post('/register', validate({ body: registerSchema }), controller.register);
  router.post('/verify-email', validate({ body: verifyEmailSchema }), controller.verifyEmail);
  router.post(
    '/resend-verification',
    validate({ body: resendVerificationSchema }),
    controller.resendVerification,
  );
  router.post('/login', validate({ body: loginSchema }), controller.login);
  router.post('/logout', requireAuth, controller.logout);
  router.get('/me', requireAuth, controller.me);

  return {
    router,
    sessionMiddleware: createSessionMiddleware(sessions, deps.secureCookies),
  };
}
