import type { Request, Response, NextFunction } from 'express';
import { ulid } from 'ulid';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length > 0 ? incoming : ulid();
  res.locals.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
