import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from '../common/http-error.js';

export const validate = (schema: ZodType, source: 'body' | 'query' | 'params' = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(new HttpError(400, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.', result.error.flatten()));
      return;
    }
    req[source] = result.data;
    next();
  };
