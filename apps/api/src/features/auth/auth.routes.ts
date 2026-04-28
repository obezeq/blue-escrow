// /v1/auth router — wires rate-limits, body validation, and auth gates.
//
// Per-route limits:
//   POST /nonce    10/min/IP
//   POST /verify    5/min/IP  AND  5/min/address (both must pass)
//   POST /refresh  30/min/IP
//
// /verify per-address keyGenerator parses the SIWE message to extract the
// signer address; on parse failure it falls back to an IP-derived key so
// malformed bodies cannot bypass the limiter.

import { Router } from 'express';
import { parseSiweMessage } from 'viem/siwe';
import * as controller from './auth.controller.js';
import { requestNonceSchema, verifyMessageSchema } from './auth.schemas.js';
import { requireAuth } from '../../shared/middleware/auth.js';
import { buildRateLimit } from '../../shared/middleware/rateLimit.js';
import { zodValidate } from '../../shared/middleware/zodValidate.js';

const ONE_MINUTE = 60 * 1000;

const nonceLimiter = buildRateLimit({ name: 'auth_nonce', windowMs: ONE_MINUTE, max: 10 });

const verifyIpLimiter = buildRateLimit({ name: 'auth_verify_ip', windowMs: ONE_MINUTE, max: 5 });

const verifyAddressLimiter = buildRateLimit({
  name: 'auth_verify_addr',
  windowMs: ONE_MINUTE,
  max: 5,
  keyGenerator: (req) => {
    const body = req.body as { message?: unknown } | undefined;
    if (body && typeof body.message === 'string') {
      try {
        const parsed = parseSiweMessage(body.message);
        if (parsed.address) return `addr:${parsed.address.toLowerCase()}`;
      } catch {
        // fall through to IP fallback
      }
    }
    return `ip:${req.ip ?? 'unknown'}`;
  },
});

const refreshLimiter = buildRateLimit({ name: 'auth_refresh', windowMs: ONE_MINUTE, max: 30 });

export const authRouter: Router = Router();

authRouter.post(
  '/nonce',
  nonceLimiter,
  zodValidate(requestNonceSchema, 'body'),
  controller.requestNonce,
);

authRouter.post(
  '/verify',
  verifyIpLimiter,
  verifyAddressLimiter,
  zodValidate(verifyMessageSchema, 'body'),
  controller.verify,
);

authRouter.post('/refresh', refreshLimiter, controller.refresh);

authRouter.post('/logout', requireAuth({ types: ['access'] }), controller.logout);

authRouter.get('/me', requireAuth({ types: ['access'] }), controller.me);
