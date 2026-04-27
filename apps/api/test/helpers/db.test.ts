import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/prisma/client.js';
import { withTransaction } from './db.js';

const ADDR = '0x000000000000000000000000000000000000aaaa';

afterEach(async () => {
  // Defensive: this test should never leak, but if a future bug allows it
  // to, scrub the address so the next run starts clean.
  await prisma.user.deleteMany({ where: { addressLower: ADDR } });
});

describe('withTransaction (BEGIN/ROLLBACK)', () => {
  it('returns the value produced inside the transaction', async () => {
    const result = await withTransaction(async (tx) => {
      const u = await tx.user.create({ data: { addressLower: ADDR } });
      return u.addressLower;
    });
    expect(result).toBe(ADDR);
  });

  it('rolls back inserts so they are not visible to outside readers', async () => {
    await withTransaction(async (tx) => {
      await tx.user.create({ data: { addressLower: ADDR } });
      const inside = await tx.user.findUnique({ where: { addressLower: ADDR } });
      expect(inside).not.toBeNull();
    });

    const outside = await prisma.user.findUnique({ where: { addressLower: ADDR } });
    expect(outside).toBeNull();
  });

  it('re-throws non-rollback errors instead of swallowing them', async () => {
    await expect(
      withTransaction(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});
