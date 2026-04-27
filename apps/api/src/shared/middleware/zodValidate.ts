import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors/index.js';

export type ZodValidateSource = 'body' | 'query' | 'params';

export function zodValidate<T>(schema: ZodSchema<T>, source: ZodValidateSource) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.issues);
    }
    res.locals[source] = result.data;
    next();
  };
}
