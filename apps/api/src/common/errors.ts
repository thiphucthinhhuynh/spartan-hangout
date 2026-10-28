import { ErrorCode } from '@sh/shared';

/**
 * Base class for expected errors. Services throw these; the error handler turns them into
 * `{ error: { code, message, fields } }` responses with the given HTTP status.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields: Record<string, string> | null = null,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'The request could not be understood.') {
    super(400, ErrorCode.BAD_REQUEST, message);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Please log in to continue.') {
    super(401, ErrorCode.UNAUTHENTICATED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to do that.') {
    super(403, ErrorCode.FORBIDDEN, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super(404, ErrorCode.NOT_FOUND, message);
  }
}

/** A domain rule blocked the action; `code` says which one (e.g. ACTIVITY_FULL). */
export class ConflictError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(409, code, message);
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>, message = 'Please fix the highlighted fields.') {
    super(422, ErrorCode.VALIDATION_FAILED, message, fields);
  }
}
