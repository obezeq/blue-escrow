// Service-level tests for SIWE auth — real ECDSA signatures (EOA path)
// against the live testcontainers Postgres. We let the actual viem
// verifySiweMessage run; only the DB layer is exercised. EIP-1271 is
// covered separately in auth.service.eip1271.test.ts where the viem
// client is mocked.

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createSiweMessage } from 'viem/siwe';
import { decodeJwt } from 'jose';

import * as service from './auth.service.js';
import * as repo from './auth.repository.js';
import { prisma } from '../../prisma/client.js';
import { AuthError } from '../../shared/errors/index.js';

const CHAIN_ID = 421614;

interface SignedSiwe {
  message: string;
  signature: `0x${string}`;
  address: `0x${string}`;
  nonce: string;
}

async function startSignIn(): Promise<{
  privateKey: `0x${string}`;
  account: ReturnType<typeof privateKeyToAccount>;
  nonce: string;
  domain: string;
  scheme: 'http' | 'https';
  uri: string;
  issuedAt: Date;
  expirationTime: Date;
}> {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const params = await service.requestNonce(account.address.toLowerCase());
  return {
    privateKey,
    account,
    nonce: params.nonce,
    domain: params.domain,
    scheme: params.scheme,
    uri: params.uri,
    issuedAt: new Date(params.issuedAt),
    expirationTime: new Date(params.expirationTime),
  };
}

async function signWith(
  account: ReturnType<typeof privateKeyToAccount>,
  fields: {
    nonce: string;
    domain?: string;
    scheme?: 'http' | 'https';
    uri?: string;
    chainId?: number;
    issuedAt?: Date;
    expirationTime?: Date;
  },
): Promise<SignedSiwe> {
  const message = createSiweMessage({
    address: account.address,
    chainId: fields.chainId ?? CHAIN_ID,
    domain: fields.domain ?? 'localhost:3000',
    nonce: fields.nonce,
    uri: fields.uri ?? 'http://localhost:3000',
    version: '1',
    scheme: fields.scheme ?? 'http',
    issuedAt: fields.issuedAt,
    expirationTime: fields.expirationTime,
  });
  const signature = await account.signMessage({ message });
  return { message, signature, address: account.address, nonce: fields.nonce };
}

async function cleanAuthTables(): Promise<void> {
  await prisma.middlemanProfile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.siweNonce.deleteMany({});
  await prisma.revokedJti.deleteMany({});
}

describe('auth.service', () => {
  beforeAll(async () => {
    await cleanAuthTables();
  });

  afterEach(async () => {
    await cleanAuthTables();
  });

  describe('requestNonce', () => {
    it('returns SIWE params and persists the nonce row', async () => {
      const account = privateKeyToAccount(generatePrivateKey());
      const params = await service.requestNonce(account.address.toLowerCase());

      expect(params.nonce).toMatch(/^[0-9a-zA-Z]+$/);
      expect(params.chainId).toBe(CHAIN_ID);
      expect(params.statement).toContain('Blue Escrow');
      expect(new Date(params.expirationTime).getTime()).toBeGreaterThan(Date.now());

      const row = await prisma.siweNonce.findUnique({ where: { nonce: params.nonce } });
      expect(row?.addressLower).toBe(account.address.toLowerCase());
      expect(row?.consumedAt).toBeNull();
    });

    it('rejects non-hex addresses', async () => {
      await expect(service.requestNonce('not-an-address')).rejects.toBeInstanceOf(AuthError);
    });
  });

  describe('verifyAndIssue (EOA happy path)', () => {
    it('verifies signature, consumes nonce, upserts user, mints JWT pair', async () => {
      const ctx = await startSignIn();
      const signed = await signWith(ctx.account, { nonce: ctx.nonce });

      const out = await service.verifyAndIssue(signed.message, signed.signature);
      expect(out.user.addressLower).toBe(ctx.account.address.toLowerCase());

      const access = decodeJwt(out.accessToken);
      expect(access.typ).toBe('access');
      expect(access.sub).toBe(ctx.account.address.toLowerCase());
      expect(access.jti).toBeTruthy();

      const refresh = decodeJwt(out.refreshToken);
      expect(refresh.typ).toBe('refresh');
      expect(refresh.family).toBeTruthy();

      const consumed = await prisma.siweNonce.findUnique({ where: { nonce: ctx.nonce } });
      expect(consumed?.consumedAt).not.toBeNull();
    });

    it('rejects replay (same message+signature twice)', async () => {
      const ctx = await startSignIn();
      const signed = await signWith(ctx.account, { nonce: ctx.nonce });

      await service.verifyAndIssue(signed.message, signed.signature);
      await expect(
        service.verifyAndIssue(signed.message, signed.signature),
      ).rejects.toBeInstanceOf(AuthError);
    });

    it('rejects an expired nonce', async () => {
      const ctx = await startSignIn();
      await prisma.siweNonce.update({
        where: { nonce: ctx.nonce },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const signed = await signWith(ctx.account, { nonce: ctx.nonce });
      await expect(
        service.verifyAndIssue(signed.message, signed.signature),
      ).rejects.toBeInstanceOf(AuthError);
    });

    it('rejects a wrong-domain message', async () => {
      const ctx = await startSignIn();
      const signed = await signWith(ctx.account, {
        nonce: ctx.nonce,
        domain: 'evil.example',
      });
      await expect(
        service.verifyAndIssue(signed.message, signed.signature),
      ).rejects.toBeInstanceOf(AuthError);
    });

    it('rejects a wrong-chain message', async () => {
      const ctx = await startSignIn();
      const signed = await signWith(ctx.account, { nonce: ctx.nonce, chainId: 1 });
      await expect(
        service.verifyAndIssue(signed.message, signed.signature),
      ).rejects.toBeInstanceOf(AuthError);
    });
  });

  describe('refresh rotation + reuse-detection', () => {
    async function signInAndIssue(): Promise<{
      account: ReturnType<typeof privateKeyToAccount>;
      tokens: Awaited<ReturnType<typeof service.verifyAndIssue>>;
    }> {
      const ctx = await startSignIn();
      const signed = await signWith(ctx.account, { nonce: ctx.nonce });
      const tokens = await service.verifyAndIssue(signed.message, signed.signature);
      return { account: ctx.account, tokens };
    }

    it('rotates the pair and revokes the old refresh jti', async () => {
      const { tokens } = await signInAndIssue();
      const oldRefreshJti = decodeJwt(tokens.refreshToken).jti as string;

      const rotated = await service.refresh(
        tokens.refreshToken,
        tokens.csrfToken,
        tokens.csrfToken,
      );
      expect(rotated.refreshToken).not.toBe(tokens.refreshToken);

      const newRefresh = decodeJwt(rotated.refreshToken);
      const oldRefresh = decodeJwt(tokens.refreshToken);
      expect(newRefresh.family).toBe(oldRefresh.family);

      const revoked = await prisma.revokedJti.findUnique({ where: { jti: oldRefreshJti } });
      expect(revoked?.reason).toBe('rotation');
    });

    it('rejects when CSRF header does not match cookie', async () => {
      const { tokens } = await signInAndIssue();
      await expect(
        service.refresh(tokens.refreshToken, 'attacker', tokens.csrfToken),
      ).rejects.toBeInstanceOf(AuthError);
    });

    it('reuse-detection: replays the old refresh, kills the family', async () => {
      const { tokens } = await signInAndIssue();
      const family = decodeJwt(tokens.refreshToken).family as string;

      // First rotation produces a new pair (B).
      const rotated = await service.refresh(
        tokens.refreshToken,
        tokens.csrfToken,
        tokens.csrfToken,
      );

      // Reusing the original refresh (A) — already revoked — must throw and
      // insert the family sentinel.
      await expect(
        service.refresh(tokens.refreshToken, tokens.csrfToken, tokens.csrfToken),
      ).rejects.toBeInstanceOf(AuthError);

      const sentinel = await prisma.revokedJti.findUnique({
        where: { jti: `family:${family}` },
      });
      expect(sentinel?.reason).toBe('family-revoked');

      // The newly-rotated (B) refresh now also fails because its family is
      // sentinel-revoked.
      await expect(
        service.refresh(rotated.refreshToken, rotated.csrfToken, rotated.csrfToken),
      ).rejects.toBeInstanceOf(AuthError);
    });
  });

  describe('logout', () => {
    it('revokes the access jti and surfaces in isRevoked', async () => {
      const ctx = await startSignIn();
      const signed = await signWith(ctx.account, { nonce: ctx.nonce });
      const tokens = await service.verifyAndIssue(signed.message, signed.signature);
      const accessJti = decodeJwt(tokens.accessToken).jti as string;
      const accessExp = decodeJwt(tokens.accessToken).exp as number;

      await service.logout(accessJti, accessExp);
      expect(await repo.isRevoked(prisma, accessJti)).toBe(true);
    });
  });
});
