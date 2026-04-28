// Bearer auth middleware. Verifies an EdDSA JWT (jose), confirms the
// token type matches the allow-list, and short-circuits revoked tokens
// via an in-process cache around RevokedJti.
//
// Cache strategy:
//   - Positive (revoked: true)  → 5-minute TTL. Once a token is dead it
//     stays dead, so caching shaves DB round-trips with no security cost.
//   - Negative (revoked: false) → 30-second TTL. This caps the window in
//     which a freshly-revoked jti can still pass auth on a peer process
//     that hasn't seen the invalidation yet. Multi-instance deploys will
//     still see ≤30 s of staleness; that is the documented MVP trade-off.
//
// Invalidation: auth.service.logout() and refresh-reuse paths call
// invalidateRevocationCache(jti) so the local instance evicts the entry
// immediately.

import type { NextFunction, Request, Response } from 'express';
import { type JWTPayload, type KeyLike, importSPKI, jwtVerify } from 'jose';
import { env } from '../../config/env.js';
import { prisma } from '../../prisma/client.js';
import * as authRepo from '../../features/auth/auth.repository.js';
import { AuthError } from '../errors/index.js';

const ALG = 'EdDSA';
const POSITIVE_TTL_MS = 5 * 60 * 1000;
const NEGATIVE_TTL_MS = 30 * 1000;

type TokenType = 'access' | 'refresh';

export interface AuthUser {
  addressLower: string;
  jti: string;
  exp: number;
  family?: string;
  typ: TokenType;
}

interface CacheEntry {
  revoked: boolean;
  cacheUntil: number;
}

const revocationCache = new Map<string, CacheEntry>();

let _publicKey: KeyLike | null = null;

async function getPublicKey(): Promise<KeyLike> {
  if (!_publicKey) _publicKey = await importSPKI(env.JWT_PUBLIC_KEY, ALG);
  return _publicKey;
}

export function invalidateRevocationCache(jti: string): void {
  revocationCache.delete(jti);
}

async function checkRevoked(jti: string, family?: string): Promise<boolean> {
  const now = Date.now();
  const cached = revocationCache.get(jti);
  if (cached && cached.cacheUntil > now) return cached.revoked;

  const revoked = await authRepo.isRevoked(prisma, jti, family);
  revocationCache.set(jti, {
    revoked,
    cacheUntil: now + (revoked ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS),
  });
  return revoked;
}

export interface RequireAuthOptions {
  types?: TokenType[];
}

export function requireAuth(options: RequireAuthOptions = {}) {
  const allowed = options.types ?? ['access'];

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.header('authorization');
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      throw new AuthError('missing bearer token');
    }
    const token = header.slice(7).trim();
    if (!token) throw new AuthError('missing bearer token');

    const key = await getPublicKey();
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, key, { algorithms: [ALG] }));
    } catch {
      throw new AuthError('token invalid');
    }

    const typ = typeof payload.typ === 'string' ? (payload.typ as TokenType) : undefined;
    if (!typ || !allowed.includes(typ)) throw new AuthError('token type not allowed');

    const sub = payload.sub;
    const jti = payload.jti;
    const exp = payload.exp;
    if (!sub || !jti || !exp) throw new AuthError('token claims malformed');

    const family = typeof payload.family === 'string' ? payload.family : undefined;
    if (typ === 'refresh' && !family) throw new AuthError('refresh family missing');

    const revoked = await checkRevoked(jti, typ === 'refresh' ? family : undefined);
    if (revoked) throw new AuthError('token revoked');

    res.locals.user = { addressLower: sub, jti, exp, family, typ };
    next();
  };
}
