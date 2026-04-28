// Zod request schemas for /v1/auth. OpenAPI registration (zod-openapi v5
// `.meta({ id })`) is wired in S08 against the v4 schema namespace; for
// S03 we use the project-default v3 import and rely on `.describe()`
// for human-readable hints. The S08 generator pass swaps these for v4.

import { z } from 'zod';

const ADDRESS_LOWER_REGEX = /^0x[0-9a-f]{40}$/;
const HEX_REGEX = /^0x[0-9a-fA-F]+$/;

export const requestNonceSchema = z
  .object({
    addressLower: z
      .string()
      .regex(ADDRESS_LOWER_REGEX, 'address must be lowercase 0x-prefixed 40-hex'),
  })
  .describe('AuthRequestNonce');

export const verifyMessageSchema = z
  .object({
    message: z.string().min(1).max(2048),
    signature: z.string().regex(HEX_REGEX, 'signature must be 0x-prefixed hex'),
  })
  .describe('AuthVerifyMessage');

export const refreshSchema = z.object({}).describe('AuthRefresh');

export const logoutSchema = z.object({}).describe('AuthLogout');

export type RequestNonceBody = z.infer<typeof requestNonceSchema>;
export type VerifyMessageBody = z.infer<typeof verifyMessageSchema>;
