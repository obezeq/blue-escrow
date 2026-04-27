import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { zodValidate } from './zodValidate.js';
import { ValidationError } from '../errors/index.js';

const schema = z.object({ name: z.string().min(1) });

function makeReq(body: unknown): Request {
  return { body, query: {}, params: {} } as unknown as Request;
}

function makeRes(): Response {
  return { locals: {} } as unknown as Response;
}

describe('zodValidate', () => {
  it('passes valid input and attaches parsed result to res.locals[source]', () => {
    const req = makeReq({ name: 'Alice' });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    zodValidate(schema, 'body')(req, res, next);
    expect(res.locals.body).toEqual({ name: 'Alice' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('throws ValidationError on invalid input with zod issues in details', () => {
    const req = makeReq({ name: '' });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    const middleware = zodValidate(schema, 'body');
    let caught: unknown;
    try {
      middleware(req, res, next);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ValidationError);
    expect(Array.isArray((caught as ValidationError).details)).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });
});
