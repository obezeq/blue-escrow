// End-to-end smoke: globalSetup spun postgres:18-alpine, applied
// migrations, and provided the URL. This file proves all four of those
// things — `inject` resolves, the client connects, models are selectable,
// and JSONB GIN indexes were applied.

import { describe, expect, inject, it } from 'vitest';
import { prisma } from '../../src/prisma/client.js';
import { withTransaction } from '../helpers/db.js';

describe('db smoke (integration)', () => {
  it('publishes the testcontainers DATABASE_URL via inject()', () => {
    const url = inject('databaseUrl');
    expect(url).toMatch(/^postgres(?:ql)?:\/\/.+/);
    expect(process.env.DATABASE_URL).toBe(url);
  });

  it('runs SELECT 1 against the live container', async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    expect(rows).toEqual([{ ok: 1 }]);
  });

  it('round-trips a User through the schema', async () => {
    const addr = '0x000000000000000000000000000000000000bbbb';
    await withTransaction(async (tx) => {
      await tx.user.create({ data: { addressLower: addr, displayName: 'smoke' } });
      const found = await tx.user.findUniqueOrThrow({ where: { addressLower: addr } });
      expect(found.displayName).toBe('smoke');
    });
  });

  it('has the manual GIN indexes from the migration', async () => {
    const rows = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE indexname IN ('deal_metadata_participants_gin', 'indexed_event_args_gin')
      ORDER BY indexname
    `;
    expect(rows.map((r) => r.indexname)).toEqual([
      'deal_metadata_participants_gin',
      'indexed_event_args_gin',
    ]);
  });
});
