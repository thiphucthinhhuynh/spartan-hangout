import type {
  LoginInput,
  MeDto,
  RegisterInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from '@sh/shared';
import type { RequestHandler } from 'express';
import { currentUser } from '../../common/auth.js';
import { clearSessionCookie, setSessionCookie } from './auth.cookies.js';
import type { AuthService } from './auth.service.js';
import type { SessionService } from './session.service.js';

// Bodies are already parsed by validate() in auth.routes.ts.
export function createAuthController(
  service: AuthService,
  sessions: SessionService,
  secureCookies: boolean,
) {
  const register: RequestHandler = async (req, res) => {
    res.status(201).json(await service.register(req.body as RegisterInput));
  };

  const verifyEmail: RequestHandler = async (req, res) => {
    res.json(await service.verifyEmail((req.body as VerifyEmailInput).token));
  };

  const resendVerification: RequestHandler = async (req, res) => {
    const { email } = req.body as ResendVerificationInput;
    res.status(202).json(await service.resendVerification(email));
  };

  const login: RequestHandler = async (req, res) => {
    const { user, token } = await service.login(req.body as LoginInput);
    setSessionCookie(res, token, secureCookies);
    res.json(user satisfies MeDto);
  };

  const logout: RequestHandler = async (req, res) => {
    if (req.sessionToken) await sessions.end(req.sessionToken);
    clearSessionCookie(res, secureCookies);
    res.status(204).end();
  };

  const me: RequestHandler = (req, res) => {
    res.json(currentUser(req) satisfies MeDto);
  };

  return { register, verifyEmail, resendVerification, login, logout, me };
}
