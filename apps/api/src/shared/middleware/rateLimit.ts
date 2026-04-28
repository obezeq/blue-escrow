// Postgres-backed rate limiter wrapping `express-rate-limit` with
// `@acpr/rate-limit-postgresql`. The store would normally auto-create
// its `rate_limit` schema (via postgres-migrations) on first construct,
// but the lib calls `applyMigrations` fire-and-forget — multiple stores
// constructed in the same tick race, leaving the schema half-built and
// every subsequent request fails-open. We pre-apply the migrations
// explicitly via `ensureRateLimitSchema()` (called from server.ts and
// test/globalSetup.ts) so by the time any store hits the DB the
// functions exist.
//
// Each call to `rateLimit()` creates a new PostgresStore with a unique
// `prefix` so multiple limiters coexist (e.g. per-IP + per-address on
// /verify). passOnStoreError keeps the API serving traffic if the
// limiter store is unavailable; the limiter behaves fail-open by design.
//
// On limit-exceeded the configured handler throws `RateLimitError` so
// the existing `errorHandler` produces the canonical envelope. Without a
// custom handler, express-rate-limit would write a string body and skip
// our requestId injection.

import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import rateLimit, { type Options } from 'express-rate-limit';
import { PostgresStore } from '@acpr/rate-limit-postgresql';
import type { Request, RequestHandler } from 'express';
import pg from 'pg';
import { migrate } from 'postgres-migrations';
import { env } from '../../config/env.js';
import { RateLimitError } from '../errors/index.js';

let _ensured: Promise<void> | null = null;

/**
 * Apply the @acpr lib's `rate_limit` schema migrations to env.DATABASE_URL.
 * Idempotent (postgres-migrations tracks applied via its own ledger
 * table). Call once at boot — server startup or test globalSetup —
 * before any limiter middleware is invoked.
 */
export function ensureRateLimitSchema(): Promise<void> {
  if (_ensured) return _ensured;
  _ensured = (async () => {
    const require = createRequire(import.meta.url);
    const libIndex = require.resolve('@acpr/rate-limit-postgresql');
    const migrationsDir = join(dirname(libIndex), 'migrations');
    const client = new pg.Client({ connectionString: env.DATABASE_URL });
    await client.connect();
    try {
      await migrate({ client }, migrationsDir);
    } finally {
      await client.end();
    }
  })();
  return _ensured;
}


export interface RateLimitConfig {
  name: string;
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string | Promise<string>;
}

export function buildRateLimit(config: RateLimitConfig): RequestHandler {
  const store = new PostgresStore({ connectionString: env.DATABASE_URL }, config.name);

  const options: Partial<Options> = {
    store,
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    passOnStoreError: true,
    handler: (): void => {
      throw new RateLimitError('rate limit exceeded', { name: config.name });
    },
  };

  if (config.keyGenerator) options.keyGenerator = config.keyGenerator;

  return rateLimit(options);
}
