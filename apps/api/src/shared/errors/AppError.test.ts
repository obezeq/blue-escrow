import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
} from './index.js';

describe('AppError hierarchy', () => {
  it.each([
    [ValidationError, 400, 'VALIDATION_FAILED', 'ValidationError'],
    [AuthError, 401, 'AUTH_REQUIRED', 'AuthError'],
    [ForbiddenError, 403, 'FORBIDDEN', 'ForbiddenError'],
    [NotFoundError, 404, 'NOT_FOUND', 'NotFoundError'],
    [RateLimitError, 429, 'RATE_LIMITED', 'RateLimitError'],
  ] as const)('%o has the right statusCode/code/name', (Cls, statusCode, code, name) => {
    const err = new Cls('test message');
    expect(err.statusCode).toBe(statusCode);
    expect(err.code).toBe(code);
    expect(err.name).toBe(name);
    expect(err.message).toBe('test message');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it('preserves details by reference', () => {
    const details = [{ path: 'foo', message: 'bar' }];
    const err = new ValidationError('test', details);
    expect(err.details).toBe(details);
  });

  it('returns undefined details when not provided', () => {
    const err = new NotFoundError('missing');
    expect(err.details).toBeUndefined();
  });
});
