import { API_PREFIX } from '@sh/shared';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { createMailer } from './common/email.js';
import { errorHandler, notFoundHandler } from './common/errorHandler.js';
import { systemClock } from './common/time.js';
import { env } from './config/env.js';
import { db } from './db.js';
import type { AppDeps } from './deps.js';
import { createApiRouter } from './routes.js';

/**
 * Builds the Express app without listening, so tests can drive it with Supertest.
 * Tests pass overrides (a fake mailer or clock); everything else uses the real collaborators.
 */
export function createApp(overrides: Partial<AppDeps> = {}) {
  const deps: AppDeps = {
    db,
    mailer: createMailer(env),
    clock: systemClock,
    appOrigin: env.APP_ORIGIN,
    ...overrides,
  };

  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use(API_PREFIX, createApiRouter(deps));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
