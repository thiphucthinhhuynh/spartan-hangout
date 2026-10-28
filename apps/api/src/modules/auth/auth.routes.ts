import { registerSchema, resendVerificationSchema, verifyEmailSchema } from '@sh/shared';
import { Router } from 'express';
import { validate } from '../../common/validate.js';
import type { AppDeps } from '../../deps.js';
import { createAuthController } from './auth.controller.js';
import { createAuthService } from './auth.service.js';

/** /api/v1/auth — see docs/api.md#auth-module-fr01fr04-fr09fr11 */
export function createAuthRouter(deps: AppDeps) {
  const controller = createAuthController(createAuthService(deps));
  const router = Router();

  router.post('/register', validate({ body: registerSchema }), controller.register);
  router.post('/verify-email', validate({ body: verifyEmailSchema }), controller.verifyEmail);
  router.post(
    '/resend-verification',
    validate({ body: resendVerificationSchema }),
    controller.resendVerification,
  );

  return router;
}
