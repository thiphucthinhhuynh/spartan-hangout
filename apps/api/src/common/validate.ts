import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ValidationError } from './errors.js';

interface RequestSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/**
 * Validates and replaces `req.body`, `req.query` and `req.params` with the parsed values of the
 * given shared Zod schemas. Failures become 422 VALIDATION_FAILED with one message per field.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const fields: Record<string, string> = {};

    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = issue.path.join('.') || part;
          fields[key] ??= issue.message;
        }
      } else if (part === 'query') {
        // Express 5 exposes req.query as a getter, so it cannot be assigned directly.
        Object.defineProperty(req, 'query', { value: result.data, writable: true });
      } else {
        req[part] = result.data as never;
      }
    }

    if (Object.keys(fields).length > 0) return next(new ValidationError(fields));
    next();
  };
}
