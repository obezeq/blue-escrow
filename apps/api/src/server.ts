import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/utils/logger.js';

const disposers: Array<() => Promise<void>> = [];

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
