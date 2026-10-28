import { ErrorCode, type ApiErrorBody } from '@sh/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, BadRequestError, NotFoundError } from './errors.js';

/** Any request that matched no route. */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError());
};

/** Turns every error into the standard JSON error envelope (docs/api.md#errors). */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appError: AppError;
  if (err instanceof AppError) {
    appError = err;
  } else if (isClientHttpError(err)) {
    // e.g. malformed JSON or an oversized body rejected by express.json()
    appError = new BadRequestError();
  } else {
    console.error(`[${req.method} ${req.originalUrl}] Unhandled error:`, err);
    appError = new AppError(
      500,
      ErrorCode.INTERNAL_ERROR,
      'Something went wrong. Please try again.',
    );
  }

  const body: ApiErrorBody = {
    error: { code: appError.code, message: appError.message, fields: appError.fields },
  };
  res.status(appError.status).json(body);
};

function isClientHttpError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const status = (err as { status?: unknown }).status;
  return typeof status === 'number' && status >= 400 && status < 500;
}
