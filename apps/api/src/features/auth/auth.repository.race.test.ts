// Property-based race tests for auth repository — required by S03
// DONE-criteria #4 ("nonce race fuzz green") and the atomic-rotation
// refactor (claimRotation must be safe under N concurrent callers).
//
// Both consumeNonce and claimRotation rely on Postgres for atomicity:
// consumeNonce on EvalPlanQual under READ COMMITTED, claimRotation on
// the PRIMARY KEY unique constraint (P2002 = SQLSTATE 23505). These
// tests assert exactly one caller observes success across N parallel
// invocations.

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import * as repo from './auth.repository.js';
import { prisma } from '../../prisma/client.js';

const ADDR = '0x000000000000000000000000000000000000eeee';

async function cleanAuthTables(): Promise<void> {
  await prisma.siweNonce.deleteMany({});
  await prisma.revokedJti.deleteMany({});
}

describe('auth.repository — race conditions', () => {
  beforeAll(cleanAuthTables);
  afterEach(cleanAuthTables);

  it('consumeNonce: exactly 1 of N=10 concurrent calls returns true', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(10), async (n) => {
        await cleanAuthTables();
        const { nonce } = await repo.createNonce(prisma, ADDR, 'localhost:3000', 60);
        const results = await Promise.all(
          Array.from({ length: n }, () => repo.consumeNonce(prisma, nonce, ADDR)),
        );
        const successes = results.filter((r) => r === true).length;
        const failures = results.filter((r) => r === false).length;
        expect(successes).toBe(1);
        expect(failures).toBe(n - 1);
      }),
      { numRuns: 25 },
    );
  }, 60_000);

  it('claimRotation: exactly 1 of N concurrent calls inserts the row', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 10 }), async (n) => {
        await cleanAuthTables();
        const jti = `race-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const expiresAt = new Date(Date.now() + 60_000);
        const results = await Promise.all(
          Array.from({ length: n }, () => repo.claimRotation(prisma, jti, expiresAt)),
        );
        const successes = results.filter((r) => r === true).length;
        const failures = results.filter((r) => r === false).length;
        expect(successes).toBe(1);
        expect(failures).toBe(n - 1);
      }),
      { numRuns: 25 },
    );
  }, 60_000);
});
