import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from './errorHandler.js';
import { ValidationError, NotFoundError } from '../errors/index.js';

function makeRes(): Response {
  const res = {
    statusCode: 200,
    locals: { requestId: 'test-req-id' } as Record<string, unknown>,
    status: vi.fn(function (this: Response, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(),
  } as unknown as Response;
  return res;
}

describe('errorHandler', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = makeRes();
    next = vi.fn() as unknown as NextFunction;
  });

  it('serialises an AppError subclass into typed JSON', () => {
    errorHandler(new NotFoundError('user not found'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: 'user not found',
        details: { requestId: 'test-req-id' },
      },
    });
  });

  it('preserves array details by wrapping in { issues, requestId }', () => {
    const issues = [{ path: 'name', message: 'required' }];
    errorHandler(new ValidationError('Validation failed', issues), req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: { issues, requestId: 'test-req-id' },
      },
    });
  });

  it('responds 500 INTERNAL for unknown errors and echoes requestId', () => {
    errorHandler(new Error('boom'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      error: {
        code: 'INTERNAL',
        message: 'Internal server error',
        details: { requestId: 'test-req-id' },
      },
    });
  });

  it('does not expose the raw error message for unknown errors', () => {
    errorHandler(new Error('SECRET-INTERNAL-DETAIL'), req, res, next);
    const jsonMock = res.json as unknown as ReturnType<typeof vi.fn>;
    const firstCallArg = jsonMock.mock.calls[0]?.[0];
    expect(firstCallArg).toBeDefined();
    expect(JSON.stringify(firstCallArg)).not.toContain('SECRET-INTERNAL-DETAIL');
  });
});
