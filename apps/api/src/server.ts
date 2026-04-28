import { env } from './config/env.js';
import { logger } from './shared/utils/logger.js';
import { ensureRateLimitSchema } from './shared/middleware/rateLimit.js';

const disposers: Array<() => Promise<void>> = [];

// Apply the @acpr/rate-limit-postgresql `rate_limit` schema BEFORE
// importing app.ts — auth.routes.ts constructs PostgresStores at module
// load and the lib's fire-and-forget applyMigrations races between
// stores. Loading app.ts only after this completes guarantees the
// schema is in place by first request.
await ensureRateLimitSchema();
const { app } = await import('./app.js');

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'api listening');
});

disposers.push(
  () => new Promise<void>((resolve) => server.close(() => resolve())),
);

for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, async () => {
    logger.info({ signal: sig }, 'api shutting down');
    await Promise.allSettled(disposers.map((d) => d()));
    process.exit(0);
  });
}

export { disposers };
