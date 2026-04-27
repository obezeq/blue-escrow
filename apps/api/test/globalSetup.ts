// S01: silence pino noise during tests. S02 replaces this with a
// testcontainers postgres:18-alpine spin-up + `prisma migrate deploy`.
export default async function setup(): Promise<void> {
  process.env.LOG_LEVEL = 'silent';
}
