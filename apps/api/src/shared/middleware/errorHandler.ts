import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';
import { failure } from '../utils/response.js';
import { logger } from '../utils/logger.js';

function withRequestId(details: unknown, requestId: string | undefined): unknown {
  if (Array.isArray(details)) return { issues: details, requestId };
  if (details && typeof details === 'object') return { ...details, requestId };
  if (details === undefined) return { requestId };
  return { detail: details, requestId };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = res.locals.requestId as string | undefined;

  if (err instanceof AppError) {
    res.status(err.statusCode).json(failure(err.code, err.message, withRequestId(err.details, requestId)));
    return;
  }

  logger.error({ err, requestId }, 'unhandled error');
  res.status(500).json(failure('INTERNAL', 'Internal server error', { requestId }));
}
