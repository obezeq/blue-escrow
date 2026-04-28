// EIP-1271 contract-wallet path. Real EIP-1271 verification calls
// eth_call against a deployed IERC1271 contract; we don't run an Anvil
// container in unit tests. Mocking only `verifySiweMessage` keeps the
// rest of the pipeline real (parseSiweMessage from viem/siwe still
// runs, so SIWE field validation is exercised).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSiweMessage } from 'viem/siwe';

vi.mock('../../integrations/blockchain/client.js', () => ({
  arbitrumSepoliaClient: { verifySiweMessage: vi.fn() },
  getClientForChain: vi.fn(),
}));

import * as service from './auth.service.js';
import { arbitrumSepoliaClient } from '../../integrations/blockchain/client.js';
import { prisma } from '../../prisma/client.js';
import { AuthError } from '../../shared/errors/index.js';

const SMART_ACCOUNT: `0x${string}` = '0x000000000000000000000000000000000000aaaa';
const FAKE_SIGNATURE: `0x${string}` =
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef1c';

async function cleanAuthTables(): Promise<void> {
  await prisma.middlemanProfile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.siweNonce.deleteMany({});
  await prisma.revokedJti.deleteMany({});
}

describe('auth.service — EIP-1271 path', () => {
  beforeEach(async () => {
    vi.mocked(arbitrumSepoliaClient.verifySiweMessage).mockReset();
    await cleanAuthTables();
  });

  afterEach(async () => {
    await cleanAuthTables();
  });

  it('issues tokens when the mocked verifier accepts a contract signature', async () => {
    vi.mocked(arbitrumSepoliaClient.verifySiweMessage).mockResolvedValue(true);

    const params = await service.requestNonce(SMART_ACCOUNT);
    const message = createSiweMessage({
      address: SMART_ACCOUNT,
      chainId: params.chainId,
      domain: params.domain,
      nonce: params.nonce,
      uri: params.uri,
      version: '1',
      scheme: params.scheme,
    });

    const out = await service.verifyAndIssue(message, FAKE_SIGNATURE);
    expect(out.user.addressLower).toBe(SMART_ACCOUNT.toLowerCase());

    expect(arbitrumSepoliaClient.verifySiweMessage).toHaveBeenCalledOnce();
    const callArg = vi.mocked(arbitrumSepoliaClient.verifySiweMessage).mock.calls[0]![0];
    expect(callArg).toMatchObject({ message, signature: FAKE_SIGNATURE });
  });

  it('throws AuthError when the mocked verifier rejects the signature', async () => {
    vi.mocked(arbitrumSepoliaClient.verifySiweMessage).mockResolvedValue(false);

    const params = await service.requestNonce(SMART_ACCOUNT);
    const message = createSiweMessage({
      address: SMART_ACCOUNT,
      chainId: params.chainId,
      domain: params.domain,
      nonce: params.nonce,
      uri: params.uri,
      version: '1',
      scheme: params.scheme,
    });

    await expect(service.verifyAndIssue(message, FAKE_SIGNATURE)).rejects.toBeInstanceOf(
      AuthError,
    );
  });
});
