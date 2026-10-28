import type { RegisterInput, ResendVerificationInput, VerifyEmailInput } from '@sh/shared';
import type { RequestHandler } from 'express';
import type { AuthService } from './auth.service.js';

// Bodies are already parsed by validate() in auth.routes.ts.
export function createAuthController(service: AuthService) {
  const register: RequestHandler = async (req, res) => {
    res.status(201).json(await service.register(req.body as RegisterInput));
  };

  const verifyEmail: RequestHandler = async (req, res) => {
    res.json(await service.verifyEmail((req.body as VerifyEmailInput).token));
  };

  const resendVerification: RequestHandler = async (req, res) => {
    res
      .status(202)
      .json(await service.resendVerification((req.body as ResendVerificationInput).email));
  };

  return { register, verifyEmail, resendVerification };
}
