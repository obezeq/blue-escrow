// SIWE auth service — verifies EIP-4361 messages via viem (incl. EIP-1271
// contract-wallet signatures), atomically consumes the nonce in Postgres,
// upserts the User profile, and mints an EdDSA JWT pair (jose):
//
//   access:  15-minute Bearer token   (no family claim)
//   refresh: 7-day cookie token       (carries family for rotation/reuse)
//
// Refresh rotation + family reuse-detection lives here. On every refresh
// we verify the token, single-trip-check both jti and family sentinel,
// revoke the old jti, and mint a new pair sharing the family. Reuse
// detection inserts a family sentinel which kills any live sibling.

import {
  type JWTPayload,
  type KeyLike,
  SignJWT,
  importPKCS8,
  importSPKI,
  jwtVerify,
} from 'jose';
import { isAddress } from 'viem';
import { parseSiweMessage } from 'viem/siwe';
import { ulid } from 'ulid';
import { env } from '../../config/env.js';
import { arbitrumSepoliaClient } from '../../integrations/blockchain/client.js';
import { prisma } from '../../prisma/client.js';
import { AuthError, NotFoundError } from '../../shared/errors/index.js';
import { invalidateRevocationCache } from '../../shared/middleware/auth.js';
import * as repo from './auth.repository.js';

const ALG = 'EdDSA';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const SUPPORTED_CHAIN_ID = 421614;
const SIWE_STATEMENT = 'Sign in to Blue Escrow.';
const NONCE_TTL_SECONDS = 300;

let _privateKey: KeyLike | null = null;
let _publicKey: KeyLike | null = null;

async function getPrivateKey(): Promise<KeyLike> {
  if (!_privateKey) _privateKey = await importPKCS8(env.JWT_PRIVATE_KEY, ALG);
  return _privateKey;
}

async function getPublicKey(): Promise<KeyLike> {
  if (!_publicKey) _publicKey = await importSPKI(env.JWT_PUBLIC_KEY, ALG);
  return _publicKey;
}

export interface NonceResponse {
  nonce: string;
  statement: string;
  uri: string;
  version: '1';
  chainId: number;
  domain: string;
  scheme: 'http' | 'https';
  issuedAt: string;
  expirationTime: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  user: {
    addressLower: string;
    displayName: string | null;
    bio: string | null;
    avatarPath: string | null;
    externalLink: string | null;
  };
}

export interface RotatedTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export async function requestNonce(addressLower: string): Promise<NonceResponse> {
  if (!isAddress(addressLower)) throw new AuthError('invalid address');
  const lower = addressLower.toLowerCase();
  const issuedAt = new Date();
  const { nonce, expiresAt } = await repo.createNonce(
    prisma,
    lower,
    env.SIWE_DOMAIN,
    NONCE_TTL_SECONDS,
  );
  return {
    nonce,
    statement: SIWE_STATEMENT,
    uri: `${env.SIWE_SCHEME}://${env.SIWE_DOMAIN}`,
    version: '1',
    chainId: SUPPORTED_CHAIN_ID,
    domain: env.SIWE_DOMAIN,
    scheme: env.SIWE_SCHEME,
    issuedAt: issuedAt.toISOString(),
    expirationTime: expiresAt.toISOString(),
  };
}

export async function verifyAndIssue(
  message: string,
  signature: `0x${string}`,
): Promise<IssuedTokens> {
  const parsed = parseSiweMessage(message);

  if (!parsed.address) throw new AuthError('siwe message missing address');
  if (!parsed.nonce) throw new AuthError('siwe message missing nonce');
  if (parsed.domain !== env.SIWE_DOMAIN) throw new AuthError('siwe domain mismatch');
  if (parsed.scheme !== env.SIWE_SCHEME) throw new AuthError('siwe scheme mismatch');
  if (parsed.chainId !== SUPPORTED_CHAIN_ID) throw new AuthError('siwe chain mismatch');

  const ok = await arbitrumSepoliaClient.verifySiweMessage({
    message,
    signature,
  });
  if (!ok) throw new AuthError('signature invalid');

  const lower = parsed.address.toLowerCase();
  const consumed = await repo.consumeNonce(prisma, parsed.nonce, lower);
  if (!consumed) throw new AuthError('nonce invalid or already consumed');

  const user = await prisma.user.upsert({
    where: { addressLower: lower },
    create: { addressLower: lower },
    update: {},
    select: {
      addressLower: true,
      displayName: true,
      bio: true,
      avatarPath: true,
      externalLink: true,
    },
  });

  const family = ulid();
  const accessToken = await signAccessToken(lower);
  const refreshToken = await signRefreshToken(lower, family);
  const csrfToken = ulid();

  return { accessToken, refreshToken, csrfToken, user };
}

export async function refresh(
  refreshToken: string,
  csrfHeader: string | undefined,
  csrfCookie: string | undefined,
): Promise<RotatedTokens> {
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    throw new AuthError('CSRF token mismatch');
  }

  const payload = await verifyJwt(refreshToken, ['refresh']);
  const sub = payload.sub;
  const jti = payload.jti;
  const exp = payload.exp;
  const family = typeof payload.family === 'string' ? payload.family : undefined;
  if (!sub || !jti || !exp || !family) throw new AuthError('refresh token malformed');

  const revoked = await repo.isRevoked(prisma, jti, family);
  if (revoked) {
    await repo.revokeFamily(prisma, family);
    invalidateRevocationCache(jti);
    throw new AuthError('refresh token reused');
  }

  await repo.revokeJti(prisma, jti, new Date(exp * 1000), 'rotation');
  invalidateRevocationCache(jti);

  const accessToken = await signAccessToken(sub);
  const newRefresh = await signRefreshToken(sub, family);
  const csrfToken = ulid();

  return { accessToken, refreshToken: newRefresh, csrfToken };
}

export async function logout(jti: string, exp: number): Promise<void> {
  await repo.revokeJti(prisma, jti, new Date(exp * 1000), 'logout');
  invalidateRevocationCache(jti);
}

export async function me(addressLower: string): Promise<{
  addressLower: string;
  displayName: string | null;
  bio: string | null;
  avatarPath: string | null;
  externalLink: string | null;
  createdAt: Date;
  updatedAt: Date;
}> {
  const user = await prisma.user.findUnique({
    where: { addressLower },
    select: {
      addressLower: true,
      displayName: true,
      bio: true,
      avatarPath: true,
      externalLink: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw new NotFoundError('user not found');
  return user;
}

async function signAccessToken(sub: string): Promise<string> {
  const key = await getPrivateKey();
  return new SignJWT({ typ: 'access' })
    .setProtectedHeader({ alg: ALG })
    .setSubject(sub)
    .setJti(ulid())
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(key);
}

async function signRefreshToken(sub: string, family: string): Promise<string> {
  const key = await getPrivateKey();
  return new SignJWT({ typ: 'refresh', family })
    .setProtectedHeader({ alg: ALG })
    .setSubject(sub)
    .setJti(ulid())
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(key);
}

export async function verifyJwt(
  token: string,
  allowedTypes: ReadonlyArray<'access' | 'refresh'>,
): Promise<JWTPayload & { typ: string; family?: string }> {
  const key = await getPublicKey();
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, key, { algorithms: [ALG] }));
  } catch {
    throw new AuthError('token invalid');
  }
  const typ = typeof payload.typ === 'string' ? payload.typ : undefined;
  if (!typ || !allowedTypes.includes(typ as 'access' | 'refresh')) {
    throw new AuthError('token type not allowed');
  }
  return payload as JWTPayload & { typ: string; family?: string };
}
