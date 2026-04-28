// Vitest globalSetup — runs once in the main process before any worker forks.
//
// Spins postgres:18-alpine via @testcontainers/postgresql, applies the
// migration set with `prisma migrate deploy`, and publishes the connection
// string two ways:
//
//   1. process.env.DATABASE_URL — so modules that load env.ts at import
//      time (logger, app, prisma client singleton) validate successfully
//      inside worker forks (forks inherit env from parent).
//   2. project.provide('databaseUrl', url) — typed via ProvidedContext
//      below, retrievable in tests via vitest's `inject('databaseUrl')`.
//
// Reuse: locally we keep the container running between runs for ~10×
// faster iteration. testcontainers gates reuse on its own env flag —
// `TESTCONTAINERS_REUSE_ENABLE=true` — so without that var .withReuse()
// is a silent no-op. CI sets `CI=true` to opt out and tears down cleanly.

import type { TestProject } from 'vitest/node';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execa } from 'execa';
import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose';

let container: StartedPostgreSqlContainer | undefined;

export async function setup(project: TestProject): Promise<void> {
  process.env.LOG_LEVEL = 'silent';
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

  // Generate an ephemeral EdDSA keypair for jose (S03 auth tests). Workers
  // fork from this process, inheriting the env so importPKCS8/importSPKI
  // succeed without the user having to populate JWT_PRIVATE/PUBLIC_KEY.
  if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
    const { privateKey, publicKey } = await generateKeyPair('EdDSA');
    process.env.JWT_PRIVATE_KEY = await exportPKCS8(privateKey);
    process.env.JWT_PUBLIC_KEY = await exportSPKI(publicKey);
  }

  const builder = new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('blue_escrow_test')
    .withUsername('test')
    .withPassword('test');

  if (process.env.CI !== 'true') builder.withReuse();

  container = await builder.start();
  const databaseUrl = container.getConnectionUri();

  process.env.DATABASE_URL = databaseUrl;

  await execa('prisma', ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
    preferLocal: true,
  });

  // Pre-apply the @acpr/rate-limit-postgresql schema before workers fork
  // and import app.ts (which constructs PostgresStore instances). The
  // lib's own constructor calls applyMigrations fire-and-forget; running
  // multiple stores in the same tick races and leaves the schema half-
  // built. Pre-applying here guarantees the rate_limit schema + stored
  // functions exist by first store hit.
  const { ensureRateLimitSchema } = await import('../src/shared/middleware/rateLimit.js');
  await ensureRateLimitSchema();

  project.provide('databaseUrl', databaseUrl);
}

export async function teardown(): Promise<void> {
  if (process.env.CI === 'true') await container?.stop();
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
