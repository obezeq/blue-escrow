# Contract Deployment Guide

How to deploy (or re-deploy) the Blue Escrow smart contract suite to Arbitrum Sepolia or Arbitrum One.

## Prerequisites

Make sure all of the following are installed and configured before deploying:

| Requirement | Verify with |
|---|---|
| Foundry (forge, cast, anvil) | `forge --version` |
| Foundry keystore wallet | `cast wallet list` (must show `blue-escrow-dev`) |
| Deployer has ETH on target chain | `cast balance $(cast wallet address --account blue-escrow-dev) --rpc-url arbitrum_sepolia --ether` |
| Etherscan V2 API key | Set in `apps/contracts/.env` as `ETHERSCAN_API_KEY` |
| RPC endpoint | Set in `apps/contracts/.env` as `ARBITRUM_SEPOLIA_RPC_URL` |
| USDC address (after first deploy) | Set in `apps/contracts/.env` as `USDC_ADDRESS` |

### .env variables

```
ARBITRUM_SEPOLIA_RPC_URL=<Alchemy/Ankr/public RPC URL for Arbitrum Sepolia>
ETHERSCAN_API_KEY=<Etherscan V2 unified API key>
USDC_ADDRESS=<MockUSDC address, set after step 1>
```

> **Never commit `.env` to git.** It is gitignored. Use `.env.example` as the template.

### Testnet faucets (Arbitrum Sepolia)

No direct Arbitrum Sepolia faucets exist without requirements. The most reliable path:

1. Mine testnet ETH on **Ethereum Sepolia** via a PoWFaucet (no account needed, CPU-based)
2. Bridge to **Arbitrum Sepolia** via bridge.arbitrum.io (connect wallet, select Sepolia networks)

Alternative faucets (may require mainnet balance or social auth):
- Bware Labs: bwarelabs.com/faucets/arbitrum-sepolia
- Triangle: faucet.triangleplatform.com/arbitrum/sepolia
- Chainlink: faucets.chain.link/arbitrum-sepolia (requires 1 LINK on mainnet)

### EVM version

`foundry.toml` sets `evm_version = "cancun"`. This is required because Arbitrum does not yet support Prague/Osaka opcodes. Cancun supports all features we use (PUSH0, TSTORE/TLOAD for ReentrancyGuardTransient, MCOPY).

---

## When to re-deploy

| Change | Re-deploy MockUSDC? | Re-deploy suite? | Update addresses? | Export ABIs? |
|---|---|---|---|---|
| Modified Escrow/Registry/NFT logic | No | Yes | Yes | Yes |
| Modified MockUSDC | Yes | Yes | Yes | No |
| Added new error/event (no ABI change) | No | Yes | Yes | No |
| Added/changed public function (ABI change) | No | Yes | Yes | Yes |
| Changed foundry.toml compiler settings | No | Yes | Yes | Yes |
| Frontend/backend changes only | No | No | No | No |

---

## Step 1: Deploy MockUSDC (only if needed)

Skip this step if MockUSDC hasn't changed. Reuse the existing address from `USDC_ADDRESS` in `.env`.

```bash
cd apps/contracts
forge create test/mocks/MockUSDC.sol:MockUSDC \
  --rpc-url arbitrum_sepolia \
  --account blue-escrow-dev \
  --verify \
  --broadcast
```

Copy the `Deployed to: 0x...` address and update `USDC_ADDRESS` in `.env`.

> **On mainnet:** Do NOT deploy MockUSDC. Use Circle's official USDC on Arbitrum One: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`. Set `USDC_ADDRESS` to this address in `.env`.

---

## Step 2: Run tests

Always verify locally before deploying to any network:

```bash
cd apps/contracts
forge test
```

All tests must pass. Do not deploy if any test fails.

---

## Step 3: Check deployer balance

Ensure the deployer has enough ETH for gas (~0.001 ETH is sufficient for a full deploy):

```bash
cast balance $(cast wallet address --account blue-escrow-dev) \
  --rpc-url arbitrum_sepolia \
  --ether
```

Also verify no pending transactions (nonce prediction depends on a clean state):

```bash
cast nonce $(cast wallet address --account blue-escrow-dev) \
  --rpc-url arbitrum_sepolia
```

---

## Step 4: Deploy the suite

```bash
cd apps/contracts
source .env
forge script script/deploy/Deploy.s.sol \
  --rpc-url arbitrum_sepolia \
  --account blue-escrow-dev \
  --sender $(cast wallet address --account blue-escrow-dev) \
  --broadcast \
  --verify \
  --slow
```

Flags explained:
- `--account blue-escrow-dev` — uses the encrypted Foundry keystore (prompts for password)
- `--sender` — deployer address, must match the keystore account
- `--broadcast` — sends transactions on-chain (without this flag, it is a dry run only)
- `--verify` — auto-verifies source code on Arbiscan via Etherscan V2 API
- `--slow` — sends transactions sequentially and waits for confirmation; critical for correct nonce prediction

The script deploys 4 contracts + 1 setup call:
1. MiddlemanRegistry(deployer)
2. SoulboundNFT(predictedEscrowAddress)
3. ReceiptNFT(predictedEscrowAddress)
4. Escrow(deployer, config, registry, soulbound, receipt)
5. escrow.addAllowedToken(usdc)

> **Circular dependency resolution:** NFT contracts need the Escrow address at construction (immutable), but Escrow needs the NFT addresses. The deploy script predicts the Escrow address via `vm.computeCreateAddress` before deploying anything, then verifies the prediction matches after deployment.

---

## Step 5: Record addresses

Copy the addresses from the deploy output logs and update:

```
packages/config/src/addresses/index.ts
```

Update the `421614` entry (Arbitrum Sepolia) or add a `42161` entry (Arbitrum One) with all 5 contract addresses (MockUSDC, MiddlemanRegistry, SoulboundNFT, ReceiptNFT, Escrow).

The broadcast output is also saved to:
```
apps/contracts/broadcast/Deploy.s.sol/<chainId>/run-latest.json
```

---

## Step 6: Export ABIs

Only needed when public/external function signatures change (added, removed, or modified parameters):

```bash
cd apps/contracts
for contract in Escrow MiddlemanRegistry SoulboundNFT ReceiptNFT; do
  jq '.abi' out/${contract}.sol/${contract}.json \
    > ../../packages/contract-abis/src/generated/${contract}.json
done
```

---

## Step 7: Verify on Arbiscan

Check each contract on sepolia.arbiscan.io (or arbiscan.io for mainnet):
- Source code shows as verified (green checkmark)
- Read Contract tab is functional
- Constructor arguments match expected values (owner, escrow address, config)

If `--verify` in step 4 failed for any contract, retry manually:

```bash
forge verify-contract <ADDRESS> src/path/Contract.sol:ContractName \
  --chain-id 421614 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" <arg>) \
  --verifier-url "https://api.etherscan.io/v2/api?chainid=421614" \
  --watch
```

For Arbitrum One (mainnet), use `--chain-id 42161` and `chainid=42161` in the verifier URL.

---

## Mainnet deployment (Arbitrum One)

Additional requirements for production:

1. **Multisig wallet** (Safe, formerly Gnosis Safe) as the deployer and owner — never a single EOA
2. **Real USDC** — `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` on Arbitrum One
3. **Professional security audit** before mainnet deployment
4. **Separate keystore** — `cast wallet import blue-escrow-prod --interactive`
5. **Real ETH on Arbitrum One** — bridge from Ethereum mainnet via bridge.arbitrum.io
6. **Add `ARBITRUM_RPC_URL`** to `.env` for mainnet RPC

```bash
cd apps/contracts
source .env
forge script script/deploy/Deploy.s.sol \
  --rpc-url arbitrum \
  --account blue-escrow-prod \
  --sender <MULTISIG_ADDRESS> \
  --broadcast \
  --verify \
  --slow
```

After mainnet deployment:
- Transfer ownership to the multisig if not already the deployer
- Verify all contracts on arbiscan.io
- Update `packages/config/src/addresses/index.ts` with the `42161` chain entry
- Do NOT delete testnet addresses — keep both entries

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Dry run enabled, not broadcasting` | Add `--broadcast` flag |
| Nonce prediction fails (Escrow address mismatch) | Ensure no pending transactions: `cast nonce <address> --rpc-url <rpc>`. If pending tx exists, wait for it to confirm or replace it. |
| Verification fails with timeout | Retry with `forge verify-contract` manually. Add `--verifier-url "https://api.etherscan.io/v2/api?chainid=<CHAIN_ID>"` if auto-detection fails. |
| `No such file or directory` | Run all commands from `apps/contracts/`, not the project root |
| Keystore password wrong | Re-import wallet: `cast wallet import blue-escrow-dev --interactive` |
| Insufficient gas | Check balance: `cast balance <address> --rpc-url <rpc> --ether`. Get testnet ETH from a faucet. |
| `Unknown evm version` from aderyn | Ensure `evm_version = "cancun"` is set in `foundry.toml` |
| `USDC_ADDRESS required on non-local chains` | Set `USDC_ADDRESS` in `.env` (deploy MockUSDC first on testnet, or use Circle USDC address on mainnet) |
