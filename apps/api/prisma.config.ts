import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7 requires the datasource URL here (it's no longer permitted in
// schema.prisma). We deliberately read process.env directly instead of
// `env<Env>('DATABASE_URL')` so commands that don't touch the database
// (`prisma --version`, `prisma format`) work without DATABASE_URL set.
// CLI commands that DO need a connection (`migrate deploy`, etc.) will
// fail at execution time with a clear "DATABASE_URL not set" error.
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: { path: path.join('prisma', 'migrations') },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
