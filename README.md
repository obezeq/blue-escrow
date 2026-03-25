# Blue Escrow

**A decentralized escrow protocol where funds are protected by the blockchain, not promises.**

[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.34-363636?logo=solidity)](https://soliditylang.org/)
[![Arbitrum](https://img.shields.io/badge/Arbitrum-One-28A0F0?logo=arbitrum)](https://arbitrum.io/)
[![Built with Foundry](https://img.shields.io/badge/Built%20with-Foundry-FFDB1C?logo=foundry)](https://getfoundry.sh/)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?logo=next.js)](https://nextjs.org/)

---

## The Problem

When two strangers make a deal online, they need a neutral third party — a middleman — to hold the funds until the deal is complete. The problem: that middleman receives the money directly and can disappear with it. There is no formal record, no verifiable history, and no mechanism for recovery.

Centralized escrow services like Escrow.com don't fully solve this either. They have geographic restrictions, high fees, and you still depend on a single company that can freeze funds, get hacked, or go bankrupt.

## The Solution

Blue Escrow removes the ability to scam by design. A smart contract on Arbitrum holds the funds — not the middleman, not a company. The middleman remains as a human arbiter for disputes, but can never access the money directly. They can only decide whether funds go to the buyer or the seller.

Every middleman's track record is stored on-chain: permanent, public, and impossible to manipulate.

| | Escrow.com | Informal Middleman | Blue Escrow |
|--|------------|-------------------|-------------|
| Who holds the funds? | The company | The middleman personally | A smart contract |
| Can the custodian scam? | Company can freeze funds or go bankrupt | Yes, easily | No. The contract is autonomous and immutable |
| Is the deal recorded? | Yes, but private and centralized | No | Yes, permanent and public on-chain |
| Verifiable middleman reputation? | N/A | No | Yes, immutable on-chain history |
| Available globally? | No (geographic restrictions) | Yes | Yes |
| Fee | 0.89% to 3.25% | Informal | 0.33% flat platform fee |

## How It Works

```
1. CREATE     Any party creates a deal on-chain (buyer, seller, or middleman)
2. JOIN       Open slots are filled by sharing a link — participants join by signing a transaction
3. SIGN       All three parties confirm their roles and the agreed price on-chain
4. FUND       The buyer deposits USDC into the smart contract
5. RESOLVE    Delivery confirmed? Funds go to seller. Dispute? Middleman decides.
6. NFTs       Middleman receives a Soulbound Token update. Buyer and seller receive receipt NFTs.
```

The backend is never involved in any financial operation. All money movement happens exclusively through the smart contract.

## Features

- **Wallet authentication** — Connect wallet, sign a message, receive a JWT. No passwords, no email.
- **Deal creation** — Create deals on-chain with or without a set price. Specify participants or share a link.
- **On-chain signatures** — All parties confirm their role cryptographically with their wallet.
- **USDC escrow** — Funds deposited directly to the smart contract. Fees calculated at deposit, collected at close.
- **Amount increases** — Buyer and seller can jointly agree to increase the deal amount mid-deal.
- **Dispute resolution** — Middleman has final say in case of disagreement or silence. Timeout-based resolution after 33 days (configurable).
- **NFTs at close** — Soulbound Token for middleman reputation. Receipt NFT for buyer and seller.
- **Middleman directory** — Public, filterable list with on-chain history and backend profile.
- **User profiles** — Name, avatar, bio, and external link managed through the backend.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Next.js (App Router), TypeScript |
| Styles | ITCSS + CSS Modules + BEM with SCSS |
| Web3 | wagmi, ethers.js, WalletConnect |
| Animations | GSAP |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL with Prisma ORM |
| Smart Contracts | Solidity, Foundry, OpenZeppelin |
| Blockchain | Arbitrum Sepolia (dev) / Arbitrum One (prod) |
| Storage | IPFS / Pinata |
| Auth | Wallet signature + JWT with roles |
| DevOps | Docker Compose, Caddy, GitHub Actions, DigitalOcean VPS |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 24 (LTS)
- [pnpm](https://pnpm.io/) >= 10
- [Foundry](https://getfoundry.sh/) (forge, cast, anvil)
- [Docker](https://www.docker.com/) and Docker Compose
- A wallet with Arbitrum Sepolia ETH for testnet deployment

### Installation

```bash
git clone https://github.com/obezeq/blue-escrow.git
cd blue-escrow
pnpm install
```

### Environment Setup

```bash
cp .env.example .env.local
# Fill in your environment variables:
# - DATABASE_URL (PostgreSQL connection string)
# - ARBITRUM_RPC_URL (Alchemy, Infura, or public RPC)
# - NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
# - PINATA_API_KEY
```

### Development

```bash
# Start all services (frontend + backend + database)
docker compose up

# Or run individually:
pnpm dev                          # All apps via Turborepo
cd apps/contracts && forge test   # Run contract tests
cd apps/contracts && anvil        # Local blockchain
```

## Architecture

This is a Turborepo + pnpm monorepo with three apps (`web`, `api`, `contracts`) and five shared packages (`types`, `config`, `contract-abis`, `tsconfig`, `eslint-config`). The frontend talks directly to smart contracts for deals and to the backend REST API for profiles and metadata.

For the complete folder structure, conventions, and architectural decisions, see [ARCHITECTURE.md](ARCHITECTURE.md).

## License

This project is licensed under the [Business Source License 1.1](LICENSE). The source code is publicly available for inspection, development, and testing, but production and commercial use is not permitted until the Change Date (2030-06-01), at which point it converts to the MIT License.

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.
