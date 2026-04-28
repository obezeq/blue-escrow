// HTTP-level tests for /v1/auth via supertest. We mock the viem client so
// every signature is "valid" — keeping the test focused on routing,
// cookies, CSRF, and the rate-limit wiring rather than ECDSA. Real
// signature verification is covered in auth.service.test.ts.
//
// Each scenario uses a unique X-Forwarded-For value so per-IP rate
// limiters don't bleed across tests (the Postgres store persists
// state between describes).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../integrations/blockchain/client.js', () => ({
  arbitrumSepoliaClient: { verifySiweMessage: vi.fn() },
  getClientForChain: vi.fn(),
}));

import request from 'supertest';
import { createSiweMessage } from 'viem/siwe';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { app } from '../../app.js';
import { arbitrumSepoliaClient } from '../../integrations/blockchain/client.js';
import { prisma } from '../../prisma/client.js';

const FAKE_SIGNATURE = '0x' + 'ab'.repeat(65);

function uniqueAddress(): `0x${string}` {
  return privateKeyToAccount(generatePrivateKey()).address;
}

async function cleanAuthTables(): Promise<void> {
  await prisma.middlemanProfile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.siweNonce.deleteMany({});
  await prisma.revokedJti.deleteMany({});
}

async function obtainNonce(
  ip: string,
  address: `0x${string}`,
): Promise<{
  nonce: string;
  domain: string;
  scheme: 'http' | 'https';
  uri: string;
  chainId: number;
}> {
  const res = await request(app)
    .post('/v1/auth/nonce')
    .set('X-Forwarded-For', ip)
    .send({ addressLower: address.toLowerCase() })
    .expect(200);
  return res.body.data;
}

async function signIn(
  ip: string,
  address: `0x${string}` = uniqueAddress(),
): Promise<{
  accessToken: string;
  refreshCookie: string;
  csrfCookie: string;
  csrfToken: string;
  address: `0x${string}`;
}> {
  vi.mocked(arbitrumSepoliaClient.verifySiweMessage).mockResolvedValue(true);
  const params = await obtainNonce(ip, address);
  const message = createSiweMessage({
    address,
    chainId: params.chainId,
    domain: params.domain,
    nonce: params.nonce,
    uri: params.uri,
    version: '1',
    scheme: params.scheme,
  });

  const res = await request(app)
    .post('/v1/auth/verify')
    .set('X-Forwarded-For', ip)
    .send({ message, signature: FAKE_SIGNATURE })
    .expect(200);

  const setCookie = res.headers['set-cookie'] as unknown as string[] | string | undefined;
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const refreshCookie = cookies.find((c) => c.startsWith('refresh=')) ?? '';
  const csrfCookie = cookies.find((c) => c.startsWith('csrf=')) ?? '';
  return {
    accessToken: res.body.data.accessToken,
    refreshCookie,
    csrfCookie,
    csrfToken: res.body.data.csrfToken,
    address,
  };
}

describe('/v1/auth (supertest)', () => {
  beforeEach(async () => {
    vi.mocked(arbitrumSepoliaClient.verifySiweMessage).mockReset();
    await cleanAuthTables();
  });

  afterEach(async () => {
    await cleanAuthTables();
  });

  it('POST /nonce returns the SIWE params envelope', async () => {
    const params = await obtainNonce('10.0.0.1', uniqueAddress());
    expect(params.nonce).toMatch(/^[0-9a-zA-Z]+$/);
    expect(params.chainId).toBe(421614);
  });

  it('POST /verify sets refresh + csrf cookies and returns access token', async () => {
    const out = await signIn('10.0.0.2');
    expect(out.accessToken).toBeTruthy();
    expect(out.refreshCookie).toMatch(/HttpOnly/i);
    expect(out.refreshCookie).toMatch(/Path=\/v1\/auth\/refresh/);
    expect(out.csrfCookie).not.toMatch(/HttpOnly/i);
    expect(out.csrfToken).toBeTruthy();
  });

  it('rate limits POST /verify after the configured threshold', async () => {
    vi.mocked(arbitrumSepoliaClient.verifySiweMessage).mockResolvedValue(true);
    const ip = '10.0.0.3';
    const address = uniqueAddress();
    const params = await obtainNonce(ip, address);
    const message = createSiweMessage({
      address,
      chainId: params.chainId,
      domain: params.domain,
      nonce: params.nonce,
      uri: params.uri,
      version: '1',
      scheme: params.scheme,
    });
    // Limits are 5/min/IP AND 5/min/address. Six rapid calls (same ip+addr)
    // exhaust both buckets — the sixth must 429.
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/v1/auth/verify')
        .set('X-Forwarded-For', ip)
        .send({ message, signature: FAKE_SIGNATURE });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it('GET /me without Authorization → 401', async () => {
    const res = await request(app).get('/v1/auth/me').set('X-Forwarded-For', '10.0.0.4');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('GET /me with valid Bearer → 200 + user profile', async () => {
    const out = await signIn('10.0.0.5');
    const res = await request(app)
      .get('/v1/auth/me')
      .set('X-Forwarded-For', '10.0.0.5')
      .set('Authorization', `Bearer ${out.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.addressLower).toBe(out.address.toLowerCase());
  });

  it('POST /logout revokes the access jti — subsequent /me returns 401', async () => {
    const out = await signIn('10.0.0.6');
    await request(app)
      .post('/v1/auth/logout')
      .set('X-Forwarded-For', '10.0.0.6')
      .set('Authorization', `Bearer ${out.accessToken}`)
      .expect(200);

    const res = await request(app)
      .get('/v1/auth/me')
      .set('X-Forwarded-For', '10.0.0.6')
      .set('Authorization', `Bearer ${out.accessToken}`);
    expect(res.status).toBe(401);
  });

  it('POST /refresh requires matching X-CSRF-Token header', async () => {
    const out = await signIn('10.0.0.7');
    const noCsrf = await request(app)
      .post('/v1/auth/refresh')
      .set('X-Forwarded-For', '10.0.0.7')
      .set('Cookie', `${out.refreshCookie.split(';')[0]}; ${out.csrfCookie.split(';')[0]}`);
    expect(noCsrf.status).toBe(401);

    const ok = await request(app)
      .post('/v1/auth/refresh')
      .set('X-Forwarded-For', '10.0.0.7')
      .set('X-CSRF-Token', out.csrfToken)
      .set('Cookie', `${out.refreshCookie.split(';')[0]}; ${out.csrfCookie.split(';')[0]}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toBeTruthy();
  });
});
