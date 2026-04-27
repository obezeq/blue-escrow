// S01: silence pino noise during tests and provide placeholder env vars so
// modules that load env.ts at import time (logger, app) succeed in test
// environments without a .env file. S02 replaces this with a testcontainers
// postgres:18-alpine spin-up + `prisma migrate deploy` for real DB tests.
export default async function setup(): Promise<void> {
  process.env.LOG_LEVEL = 'silent';
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  }
}
