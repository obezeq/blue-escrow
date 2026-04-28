// Repository layer for SIWE auth. Every method accepts a Prisma client
// (PrismaClient or TransactionClient) so tests can pass the rollback-tx
// from test/helpers/db.ts without re-wiring the singleton.

import { generateSiweNonce } from 'viem/siwe';
import { Prisma } from '../../generated/prisma/client.js';
import type { SiweNonce, RevokedJti } from '../../generated/prisma/client.js';

type Db = Prisma.TransactionClient;

const FAMILY_PREFIX = 'family:';

/**
 * Insert a fresh SIWE nonce row keyed on the viem-generated nonce string.
 * Returns the nonce + computed expiry so the service can include them in
 * the response.
 */
export async function createNonce(
  db: Db,
  addressLower: string,
  domain: string,
  ttlSeconds = 300,
): Promise<{ nonce: string; expiresAt: Date }> {
  const nonce = generateSiweNonce();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await db.siweNonce.create({
    data: { nonce, addressLower, domain, expiresAt },
  });
  return { nonce, expiresAt };
}

/**
 * Atomic single-use consume. Returns true if THIS call observed the
 * transition unconsumed → consumed; false otherwise (already consumed,
 * expired, wrong address, or no such row).
 *
 * Race safety: Postgres UPDATE acquires row-level locks during scan.
 * Under concurrent calls with the same (nonce, addressLower), the second
 * transaction blocks on the row lock, then re-evaluates the WHERE
 * predicate against the freshly committed row (EvalPlanQual). The second
 * call sees consumedAt != null and matches zero rows. Hence exactly one
 * caller observes count === 1 at READ COMMITTED — no SERIALIZABLE
 * isolation upgrade required.
 *
 * Do NOT split into findFirst + update — that pattern is not atomic.
 */
export async function consumeNonce(
  db: Db,
  nonce: string,
  addressLower: string,
): Promise<boolean> {
  const result = await db.siweNonce.updateMany({
    where: {
      nonce,
      addressLower,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });
  return result.count === 1;
}

/**
 * Insert a revocation row. PK conflict is swallowed (idempotent — same
 * jti revoked twice from different code paths is harmless).
 */
export async function revokeJti(
  db: Db,
  jti: string,
  expiresAt: Date,
  reason: string,
): Promise<void> {
  await db.revokedJti.upsert({
    where: { jti },
    create: { jti, expiresAt, reason },
    update: {},
  });
}

/**
 * Atomic single-shot rotation marker used by /v1/auth/refresh. Returns
 * true if THIS call inserted the revocation row (won the claim), false
 * if another caller beat us to it (P2002 unique-constraint violation).
 *
 * Idiomatic Prisma equivalent of:
 *   INSERT INTO revoked_jti (jti, expires_at, reason)
 *   VALUES ($1, $2, 'rotation') ON CONFLICT DO NOTHING RETURNING jti
 *
 * Single round-trip — no SELECT-then-INSERT TOCTOU window. Prisma compiles
 * .create() to a single `INSERT ... RETURNING` statement; P2002 surfaces
 * Postgres SQLSTATE 23505. The caller treats `false` as "lost the race
 * or refresh replayed" and revokes the family fail-secure.
 */
export async function claimRotation(
  db: Db,
  jti: string,
  expiresAt: Date,
): Promise<boolean> {
  try {
    await db.revokedJti.create({ data: { jti, expiresAt, reason: 'rotation' } });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return false;
    }
    throw e;
  }
}

/**
 * Family revocation sentinel.
 *
 * We don't persist (jti -> family) at issuance, so we can't enumerate
 * live siblings. Instead, on detected reuse we insert a single sentinel
 * row 'family:<ulid>' into RevokedJti. Every refresh path then performs
 * ONE combined PK lookup over [claims.jti, 'family:'+claims.family] and
 * rejects if either is present. expiresAt is set to max refresh TTL (7d)
 * so the sentinel survives any live sibling.
 *
 * Access tokens are NOT family-checked: they carry no family claim, and
 * logout revokes their jti directly. Refresh-only is the canonical scope
 * for rotation/reuse detection.
 */
export async function revokeFamily(
  db: Db,
  familyId: string,
  reason = 'family-revoked',
): Promise<void> {
  const jti = FAMILY_PREFIX + familyId;
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  // Idempotent INSERT — Prisma upsert is SELECT+INSERT/UPDATE under the
  // hood and races on the SELECT under concurrent calls. The PK-unique
  // INSERT is atomic; we swallow P2002 to keep "already revoked" a no-op.
  try {
    await db.revokedJti.create({ data: { jti, expiresAt, reason } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return;
    throw e;
  }
}

/**
 * Single round-trip revocation check covering both jti and (optional)
 * family sentinel. Returns true if ANY of the candidate keys exists.
 */
export async function isRevoked(
  db: Db,
  jti: string,
  family?: string,
): Promise<boolean> {
  const keys = family ? [jti, FAMILY_PREFIX + family] : [jti];
  const rows = await db.revokedJti.findMany({
    where: { jti: { in: keys } },
    select: { jti: true },
  });
  return rows.length > 0;
}

/**
 * Sweep expired auth rows. Exposed for ops/cron; not auto-scheduled in
 * MVP. Returns counts for observability.
 */
export async function cleanupExpired(
  db: Db,
): Promise<{ nonces: number; jtis: number }> {
  const now = new Date();
  const [nonces, jtis] = await Promise.all([
    db.siweNonce.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.revokedJti.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return { nonces: nonces.count, jtis: jtis.count };
}

export type { SiweNonce, RevokedJti };
