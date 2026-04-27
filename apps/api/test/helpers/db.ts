// Per-test database isolation helper. Wraps `fn` in a Prisma transaction
// that is always rolled back, so tests share the long-lived testcontainers
// postgres instance without leaking rows into one another.
//
// Trade-off: code under test must accept the `tx` client (not import the
// singleton). For S04+ feature code, repository functions take a Prisma
// client argument exactly to support this pattern; ad-hoc helpers can use
// `tx.$queryRaw` etc.
//
// Why a sentinel rather than `prisma.$transaction({ rollback: true })`?
// Prisma has no public "rollback after success" API — the only way to
// abort a transaction is to throw. We throw a unique Symbol so we can
// distinguish it from real errors and re-throw anything else.

import { Prisma } from '../../src/generated/prisma/client.js';
import { prisma } from '../../src/prisma/client.js';

const ROLLBACK = Symbol('test-rollback');

export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let result!: T;
  try {
    await prisma.$transaction(async (tx) => {
      result = await fn(tx);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
  return result;
}
