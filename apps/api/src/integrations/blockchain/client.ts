// Read-only viem PublicClient for Arbitrum Sepolia. The backend never holds
// private keys — it only verifies signatures (SIWE / EIP-1271) and reads
// chain state for the indexer (S07). All write paths live in the smart
// contract / frontend.
//
// fallback transport: the env-supplied RPC is preferred; a public viem
// fallback ensures dev/local works even when RPC_URL_ARBITRUM_SEPOLIA is a
// placeholder.

import { createPublicClient, fallback, http, type PublicClient } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { env } from '../../config/env.js';
import { ValidationError } from '../../shared/errors/index.js';

export const arbitrumSepoliaClient: PublicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: fallback([http(env.RPC_URL_ARBITRUM_SEPOLIA), http()]),
});

export function getClientForChain(chainId: number): PublicClient {
  if (chainId === arbitrumSepolia.id) return arbitrumSepoliaClient;
  throw new ValidationError('Unsupported chain', { chainId });
}
