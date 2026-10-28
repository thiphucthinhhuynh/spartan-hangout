import { API_PREFIX } from '@sh/shared';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './common/errorHandler.js';
import { apiRouter } from './routes.js';

/** Builds the Express app without listening, so tests can drive it with Supertest. */
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use(API_PREFIX, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
