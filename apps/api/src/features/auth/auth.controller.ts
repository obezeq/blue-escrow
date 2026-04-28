// Express handlers for /v1/auth. Throws AppError subtypes — Express 5
// captures them and routes to errorHandler. Reads parsed bodies from
// res.locals (populated by zodValidate). Refresh + CSRF cookies are
// scoped to /v1/auth/refresh per the session contract; logout therefore
// only revokes the access jti (refresh dies on its 7-day TTL).

import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { AuthError } from '../../shared/errors/index.js';
import { success } from '../../shared/utils/response.js';
import type { AuthUser } from '../../shared/middleware/auth.js';
import * as service from './auth.service.js';
import type { RequestNonceBody, VerifyMessageBody } from './auth.schemas.js';

const REFRESH_COOKIE = 'refresh';
const CSRF_COOKIE = 'csrf';
const COOKIE_PATH = '/v1/auth/refresh';
const REFRESH_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

function cookieDomain(): string | undefined {
  return env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN;
}

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.SIWE_SCHEME === 'https',
    // SameSite=Lax (NOT Strict) so the cookie survives the cross-site
    // redirect WalletConnect / mobile wallets perform on sign-in.
    sameSite: 'lax',
    domain: cookieDomain(),
    path: COOKIE_PATH,
    maxAge: REFRESH_MAX_AGE_MS,
  };
}

function csrfCookieOptions(): CookieOptions {
  return {
    // Readable by the SPA so it can mirror the value in `X-CSRF-Token`.
    httpOnly: false,
    secure: env.SIWE_SCHEME === 'https',
    sameSite: 'lax',
    domain: cookieDomain(),
    path: COOKIE_PATH,
    maxAge: REFRESH_MAX_AGE_MS,
  };
}

export async function requestNonce(_req: Request, res: Response): Promise<void> {
  const body = res.locals.body as RequestNonceBody;
  const data = await service.requestNonce(body.addressLower);
  res.json(success(data));
}

export async function verify(_req: Request, res: Response): Promise<void> {
  const body = res.locals.body as VerifyMessageBody;
  const { accessToken, refreshToken, csrfToken, user } = await service.verifyAndIssue(
    body.message,
    body.signature as `0x${string}`,
  );
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions());
  res.json(success({ accessToken, csrfToken, user }));
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = (req.cookies as Record<string, string | undefined> | undefined)?.[
    REFRESH_COOKIE
  ];
  const csrfCookie = (req.cookies as Record<string, string | undefined> | undefined)?.[
    CSRF_COOKIE
  ];
  const csrfHeader = req.header('x-csrf-token') ?? undefined;
  if (!refreshToken) throw new AuthError('refresh cookie missing');

  const { accessToken, refreshToken: newRefresh, csrfToken } = await service.refresh(
    refreshToken,
    csrfHeader,
    csrfCookie,
  );
  res.cookie(REFRESH_COOKIE, newRefresh, refreshCookieOptions());
  res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions());
  res.json(success({ accessToken, csrfToken }));
}

export async function logout(_req: Request, res: Response): Promise<void> {
  const user = res.locals.user as AuthUser | undefined;
  if (!user) throw new AuthError('unauthenticated');
  await service.logout(user.jti, user.exp);
  res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH, domain: cookieDomain() });
  res.clearCookie(CSRF_COOKIE, { path: COOKIE_PATH, domain: cookieDomain() });
  res.json(success({ ok: true }));
}

export async function me(_req: Request, res: Response): Promise<void> {
  const user = res.locals.user as AuthUser | undefined;
  if (!user) throw new AuthError('unauthenticated');
  const profile = await service.me(user.addressLower);
  res.json(success(profile));
}
