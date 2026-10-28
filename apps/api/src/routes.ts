import { Router } from 'express';
import { healthHandler } from './health.js';

/** Every route under /api/v1. Feature modules register their routers here as they are built. */
export const apiRouter = Router();

apiRouter.get('/health', healthHandler);
