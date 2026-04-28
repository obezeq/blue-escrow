// Validation matrix for the requireAuth middleware. Mounts the
// middleware on a tiny Express app and exercises every rejection path.
// Tokens are minted directly with jose so we don't depend on the SIWE
// flow.

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { SignJWT, importPKCS8 } from 'jose';
import { ulid } from 'ulid';
import { env } from '../../config/env.js';
import { errorHandler } from './errorHandler.js';
import { invalidateRevocationCache, requireAuth } from './auth.js';
import * as authRepo from '../../features/auth/auth.repository.js';
import { prisma } from '../../prisma/client.js';

const ALG = 'EdDSA';
const ADDR = '0x000000000000000000000000000000000000cccc';
const JWT_AUDIENCE = 'blue-escrow-api';

let signKey: Awaited<ReturnType<typeof importPKCS8>>;

async function mintAccess(jti = ulid(), ttl = '15m'): Promise<string> {
  return new SignJWT({ typ: 'access' })
    .setProtectedHeader({ alg: ALG })
    .setSubject(ADDR)
    .setJti(jti)
    .setIssuedAt()
    .setIssuer(env.SIWE_DOMAIN)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(ttl)
    .sign(signKey);
}

async function mintRefresh(family: string, jti = ulid(), ttl = '7d'): Promise<string> {
  return new SignJWT({ typ: 'refresh', family })
    .setProtectedHeader({ alg: ALG })
    .setSubject(ADDR)
    .setJti(jti)
    .setIssuedAt()
    .setIssuer(env.SIWE_DOMAIN)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(ttl)
    .sign(signKey);
}

function buildApp(types: ('access' | 'refresh')[] = ['access']) {
  const app = express();
  app.get('/probe', requireAuth({ types }), (_req, res) => {
    res.json(res.locals.user ?? null);
  });
  app.use(errorHandler);
  return app;
}

describe('requireAuth middleware', () => {
  beforeAll(async () => {
    signKey = await importPKCS8(env.JWT_PRIVATE_KEY, ALG);
  });

  afterEach(async () => {
    await prisma.revokedJti.deleteMany({});
  });

  it('rejects requests with no Authorization header', async () => {
    const res = await request(buildApp()).get('/probe');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('rejects headers missing the Bearer prefix', async () => {
    const token = await mintAccess();
    const res = await request(buildApp()).get('/probe').set('Authorization', token);
    expect(res.status).toBe(401);
  });

  it('rejects a valid refresh token on an access-only route', async () => {
    const token = await mintRefresh(ulid());
    const res = await request(buildApp(['access']))
      .get('/probe')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('rejects a token whose jti has been revoked', async () => {
    const jti = ulid();
    const token = await mintAccess(jti);
    await authRepo.revokeJti(prisma, jti, new Date(Date.now() + 60_000), 'logout');
    invalidateRevocationCache(jti);

    const res = await request(buildApp())
      .get('/probe')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('rejects a refresh token whose family sentinel has been set', async () => {
    const family = ulid();
    const jti = ulid();
    const token = await mintRefresh(family, jti);
    await authRepo.revokeFamily(prisma, family);
    invalidateRevocationCache(jti);

    const res = await request(buildApp(['refresh']))
      .get('/probe')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('passes a valid access token and populates res.locals.user', async () => {
    const jti = ulid();
    const token = await mintAccess(jti);
    invalidateRevocationCache(jti);

    const res = await request(buildApp())
      .get('/probe')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ addressLower: ADDR, jti, typ: 'access' });
  });
});
