import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';

// Single PrismaClient per process. The driver-adapter (Prisma 7 stable)
// owns the pg connection pool — no second pool layered on top. Pool tuning
// is deliberately deferred to a pre-built `pg.Pool` if/when we hit
// pooling issues (see prisma/prisma#28971).
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

export type { PrismaClient } from '../generated/prisma/client.js';
