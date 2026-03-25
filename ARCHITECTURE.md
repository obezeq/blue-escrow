# Blue Escrow — Folder Architecture

This document is the canonical reference for the folder structure of the Blue Escrow monorepo. It defines folder names and their purposes, not individual file names. Any future session building this project MUST follow this structure. The architecture is a Turborepo + pnpm monorepo with the `apps/` + `packages/` pattern.

| Layer | Stack |
|-------|-------|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Frontend** | React + Next.js (App Router) + TypeScript |
| **Styles** | ITCSS + CSS Modules + BEM with SCSS |
| **Web3 (frontend)** | wagmi, ethers.js, WalletConnect |
| **Animations** | GSAP |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Smart Contracts** | Solidity + Foundry + OpenZeppelin |
| **Blockchain** | Arbitrum Sepolia (dev) / Arbitrum One (prod) |
| **Storage** | IPFS / Pinata |
| **Auth** | Wallet signature + JWT with roles |
| **DevOps** | Docker Compose, Nginx, GitHub Actions, VPS DigitalOcean |

---

## 1. Root Monorepo Structure

The monorepo follows the Turborepo convention: `apps/` contains deployable applications, `packages/` contains shared internal libraries. Root-level configuration files (`turbo.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `.env.example`, `compose.yml`, etc.) live at the root and are not listed here since they depend on tooling versions at build time.

```
blue-escrow/
  apps/
    web/                  -- Next.js frontend application (includes its own Dockerfile)
    api/                  -- Express backend API server (includes its own Dockerfile)
    contracts/            -- Solidity smart contracts (Foundry project)
  packages/
    types/                -- Shared TypeScript type definitions (frontend + backend)
    config/               -- Shared configuration (addresses, constants, chain config, enums)
    contract-abis/        -- Generated ABI JSON + TS bindings from contract compilation
    tsconfig/             -- Shared TypeScript configurations (base, nextjs, node)
    eslint-config/        -- Shared ESLint configurations
  e2e/                    -- End-to-end tests (Playwright + local Anvil for frontend-to-contract flows)
  docker/
    nginx/                -- Nginx configuration (reverse proxy, SSL, caching)
  .github/
    workflows/            -- GitHub Actions CI/CD pipelines
    ISSUE_TEMPLATE/       -- Issue templates
    PULL_REQUEST_TEMPLATE/ -- PR template
```

### Folder purposes

- **`apps/`** — Deployable applications. Each app is independently buildable and deployable. They consume from `packages/` via pnpm workspace protocol. Apps NEVER import directly from another app. Each app contains its own `Dockerfile` (co-located, following the Turborepo convention).
- **`packages/`** — Shared internal libraries. Never deployed on their own. Consumed by apps. Each package has a single purpose and its own `package.json`.
- **`e2e/`** — End-to-end tests using Playwright against a local Anvil node. Tests critical user flows across frontend and smart contracts (deal lifecycle: create -> fund -> resolve). Runs in CI with a local blockchain fork.
- **`docker/`** — Nginx reverse proxy configuration. Dockerfiles live co-located inside each app (`apps/web/Dockerfile`, `apps/api/Dockerfile`) following the Turborepo pattern.
- **`.github/`** — CI/CD workflows, issue templates, PR templates.

---

## 2. Frontend — apps/web/

Next.js App Router for routing and SSR/ISR. Feature-based organization for domain logic. ITCSS for global style layering. CSS Modules with BEM for component-scoped styles. GSAP for animations. wagmi + ethers.js for blockchain interaction. The frontend communicates with the backend REST API for profiles and metadata, and directly with smart contracts for all deal and financial operations.

```
apps/web/
  public/                     -- Static assets (favicons, images, fonts, OG images)
  src/
    app/                      -- Next.js App Router (routes, layouts, pages, loading/error states)
      (marketing)/            -- Route group: public pages (landing, about, how-it-works)
      (app)/                  -- Route group: authenticated pages (deals, profile, middleman dashboard)
    components/
      ui/                     -- Generic reusable UI primitives (buttons, inputs, modals, cards, badges, tooltips, spinners)
      layout/                 -- Structural layout components (header, footer, sidebar, navigation)
      web3/                   -- Wallet-specific UI (connect button, network switch, address display, tx status)
    features/
      auth/                   -- Wallet authentication flow (connect, sign message, JWT management)
      deals/                  -- Deal creation, joining, signing, deposit, resolution UI and logic
      middleman/              -- Middleman registration, directory, public profile, reputation display
      profile/                -- User profile management (edit name, bio, avatar)
      nfts/                   -- NFT gallery, soulbound token viewer, receipt display
    hooks/                    -- Global shared React hooks (not tied to a specific feature)
    lib/
      web3/                   -- wagmi configuration, contract instances, chain config, provider setup
      api/                    -- REST API client, fetch wrappers, endpoint definitions
      utils/                  -- General utility functions (formatting, validation, dates)
    styles/
      settings/               -- ITCSS Layer 1: Design tokens ($colors, $spacing, $typography, $breakpoints)
      tools/                  -- ITCSS Layer 2: Mixins and functions (responsive, typography, layout helpers)
      generic/                -- ITCSS Layer 3: CSS resets, normalize, box-sizing
      elements/               -- ITCSS Layer 4: Bare HTML element styles (headings, links, forms, tables)
      objects/                -- ITCSS Layer 5: Layout patterns (grid, container, wrapper, media-object)
      utilities/              -- ITCSS Layer 7: Utility/helper classes (visually-hidden, text-center, spacing)
    animations/
      config/                 -- One-time GSAP plugin registration, global defaults, matchMedia setup
      hooks/                  -- Custom animation hooks (useRevealOnScroll, useParallax, useSplitText)
      presets/                -- Reusable animation presets (fadeIn, slideUp, staggerChildren, textReveal)
      scrollTrigger/          -- ScrollTrigger scene configs (pinned sections, parallax, scrub)
      timelines/              -- Complex animation sequences and master timelines
    providers/                -- React context providers (Web3Provider, AuthProvider, ThemeProvider)
    constants/                -- Frontend-specific constants (routes, feature flags, UI config)
    types/                    -- Frontend-specific type definitions (extends shared types from packages/types)
```

### Key decisions

**App Router route groups**: `(marketing)` pages are public and pre-rendered (SSR/ISR). `(app)` pages require wallet connection and are primarily client-rendered. The parentheses create organizational groups without affecting the URL structure.

**Components vs Features**: `components/` holds generic, reusable pieces (a Button, a Modal). `features/` holds domain-specific modules — each feature contains its own `components/`, `hooks/`, and `lib/` subfolders internally. A feature owns all the code needed for its domain.

**ITCSS + CSS Modules hybrid**: The `styles/` folder follows ITCSS layering for global styles imported once in the root layout. ITCSS Layer 6 (Components) does NOT live in `styles/` — component styles live colocated as `.module.scss` files next to their `.tsx` components. This gives you global cascade control via ITCSS and component isolation via CSS Modules.

**GSAP animations**: `animations/config/` registers all GSAP plugins once (ScrollTrigger, SplitText, etc.) and sets global defaults — import gsap from here, never directly from `'gsap'`. `animations/hooks/` contains custom React hooks wrapping `useGSAP` for common patterns (scroll reveals, parallax, text splits). `animations/presets/` stores reusable animation definitions for visual consistency across the site. `animations/scrollTrigger/` holds complex ScrollTrigger scene configs (pinning, scrub, parallax layers). `animations/timelines/` stores master timeline sequences. Component-specific one-off animations can live colocated within their component or feature folder.

**Web3 separation**: `lib/web3/` handles blockchain configuration and contract setup (wagmi config, chain definitions, contract addresses). `components/web3/` handles wallet-related UI. `features/deals/` handles the business logic that interacts with contracts through hooks wrapping wagmi.

**Next.js middleware**: The App Router uses a root-level `middleware.ts` file (inside `src/`) for edge middleware — auth redirects, route protection for `(app)/*` routes, and request inspection. This is a single file convention, not a folder.

---

## 3. Backend — apps/api/

Express + TypeScript REST API following a feature-based outer structure with layered inner architecture. Each feature module follows the Controller -> Service -> Repository pattern. The backend handles user profiles, authentication (wallet signature + JWT), middleman metadata, and deal metadata indexing. It NEVER handles money or deal state — all financial logic lives on-chain.

```
apps/api/
  src/
    config/                   -- Application configuration (env validation, database, JWT, CORS settings)
    shared/
      middleware/             -- Express middleware (auth, validation, error handling, rate limiting, helmet)
      errors/                 -- Custom error classes and error handling infrastructure
      validators/             -- Shared validation schemas (Zod)
      guards/                 -- Authorization guards (role-based access, resource ownership checks)
      utils/                  -- Shared utility functions (logger, crypto helpers, response formatting)
      types/                  -- Backend-specific type definitions
    features/
      auth/                   -- Wallet signature verification, nonce challenge, JWT issuance, session mgmt
      users/                  -- User profile CRUD, avatar upload
      middlemen/              -- Middleman registration, directory listing, stats aggregation
      deals/                  -- Deal metadata indexing, off-chain deal info storage
      nfts/                   -- NFT metadata serving (tokenURI endpoint for on-chain NFTs)
    integrations/
      blockchain/             -- On-chain event listener/indexer, contract read helpers, provider config
      ipfs/                   -- IPFS/Pinata upload and retrieval service
    constants/                -- Backend-specific constants (pagination limits, nonce expiry, JWT duration)
    prisma/                   -- Prisma schema, migrations, seed data
    docs/                     -- Swagger/OpenAPI documentation configuration
```

### Key decisions

**Feature module inner structure**: Each folder inside `features/` follows this internal layering: routes (HTTP endpoint definitions) -> controller (request/response handling) -> service (business logic, orchestration) -> repository (Prisma data access). This pattern is NOT enforced by folder nesting — all files for a feature live flat inside the feature folder, named by convention.

**shared/ vs config/**: `config/` handles environment-dependent configuration loading and validation (fail-fast: the app won't start if required env vars are missing). `shared/` contains reusable infrastructure code used across all features (middleware, error classes, guards, validators).

**integrations/**: Services that connect to external systems. `blockchain/` is the indexer that listens to on-chain events and syncs deal metadata to PostgreSQL for fast querying — this is a read-only mirror of on-chain state, NOT deal logic. `ipfs/` wraps Pinata for uploading and retrieving terms of service and other files.

**constants/**: Backend-specific application constants (pagination limits, nonce expiry times, JWT durations, feature flags). Separate from `packages/config/` (monorepo-wide shared config) and `config/` (environment-dependent settings). Eliminates magic numbers throughout the codebase.

**prisma/**: Contains the database schema, migration history, and seed scripts. The schema defines users, middleman profiles, deal metadata (mirrored from on-chain), and session/nonce data for wallet auth.

**Security**: Centralized error handling via middleware. Input validation at boundaries with Zod. JWT verification on protected routes. Rate limiting. Helmet for security headers. No secrets in code — everything through environment variables.

---

## 4. Smart Contracts — apps/contracts/

Foundry project following modular contract design with OpenZeppelin. The contract system manages: escrow custody (USDC), deal state machine, participant signatures, dispute resolution, fee distribution (0.33% platform + middleman commission), timeout execution, and NFT issuance (Soulbound for middlemen, receipt NFTs for parties). All conventions follow the Cyfrin Solidity Development Standards.

```
apps/contracts/
  src/
    interfaces/               -- Contract interfaces (IEscrow, IMiddlemanRegistry, IReceiptNFT, ISoulboundNFT)
    abstract/                 -- Abstract base contracts with shared logic (EscrowBase, NFTBase)
    libraries/                -- Solidity libraries (state machine helpers, validation, math, safe transfers)
    core/                     -- Core escrow and deal logic contracts (Escrow, EscrowFactory)
    tokens/                   -- NFT contracts (ReceiptNFT for parties, SoulboundNFT for middlemen)
    registry/                 -- Middleman registry and fee configuration contracts
    types/                    -- Shared Solidity struct and enum definitions (Deal, Resolution, Participant)
    utils/                    -- Custom error definitions and event definitions
  test/
    unit/                     -- Unit tests per contract (prefer stateless fuzz over hardcoded values)
    integration/              -- Multi-contract interaction tests (full deal flow, dispute flow)
    invariant/                -- Stateful fuzz tests for protocol invariants (FREI-PI pattern)
    mocks/                    -- Mock contracts for testing (MockERC20/USDC, MockOracle, etc.)
  script/
    deploy/                   -- Foundry deployment scripts (Sepolia and mainnet, same logic)
    interact/                 -- Post-deployment interaction scripts (create deal, fund, resolve)
  lib/                        -- Foundry dependencies (forge-std, OpenZeppelin via forge install)
```

### Key decisions

**Modular design**: `interfaces/` define the external API contract. `abstract/` provide shared internal logic inherited by implementations. `libraries/` provide stateless pure/view utility functions. `core/` contains the concrete implementations that users interact with. `types/` externalizes shared struct and enum definitions (Deal, DealState, Resolution, Participant) so they can be imported across contracts without duplication — following Seaport and Sablier conventions. This separation enables testing with mocks and future extensibility.

**Test strategy (Cyfrin standards)**: Unit tests use stateless fuzz (Foundry's built-in fuzzer) — `function testMyTest(uint256 randomNumber)` over hardcoded values. Integration tests verify multi-contract workflows (init -> fund -> complete). Invariant tests encode protocol properties that must always hold (e.g., "total funds in contract >= sum of all active deal amounts"). Use the branching tree technique (`.tree` files) to map all execution paths before writing tests.

**Deployment scripts**: `deploy/` uses Foundry scripts (`forge script`) for both Sepolia and mainnet — same deployment logic runs in dev and production. NEVER expose private keys in scripts — use `forge script --account $ACCOUNT --sender $SENDER`. Scripts are auditable code and should be treated as part of the security surface.

**Contract conventions**: Custom errors prefixed with contract name and double underscore (`Escrow__InvalidState()`). Prefer `revert` over `require`. Strict pragma for core contracts, floating for tests/libraries/interfaces. `ReentrancyGuardTransient` for reentrancy protection. `Ownable2Step` over `Ownable`. Named return variables where possible. `calldata` over `memory` for read-only inputs. Admin must be a multisig from the very first mainnet deployment.

**CI pipeline**: `solhint` (linter), `forge build --sizes` (verify < 24KB), `aderyn` or `slither` (static analysis), fuzz/invariant testing with reasonable time budget (~10 min per tool). Run in parallel via matrix strategy.

---

## 5. Shared Packages — packages/

Internal packages consumed by apps via pnpm workspace protocol. These ensure type safety, configuration consistency, and ABI synchronization across the entire monorepo.

```
packages/
  types/                      -- Shared TypeScript types used by both frontend and backend
    src/
      deals/                  -- Deal-related types (states, participants, resolution outcomes)
      users/                  -- User and middleman profile types
      contracts/              -- Contract event types, transaction types
      api/                    -- API request/response types, error types, pagination
  config/                     -- Shared runtime constants and configuration
    src/
      addresses/              -- Contract addresses per chain (Sepolia, Arbitrum One)
      chains/                 -- Chain configuration (RPC URLs, block explorers, chain IDs)
      constants/              -- Protocol constants (platform fee, timeouts, limits)
      enums/                  -- Shared enums (DealState, UserRole, ResolutionType)
  contract-abis/              -- Auto-generated ABI JSON + TypeScript bindings from Foundry compilation
    src/
      generated/              -- Output from Foundry build, consumed by wagmi/ethers
  tsconfig/                   -- Shared TypeScript base configurations (base, nextjs, node)
  eslint-config/              -- Shared ESLint configurations
```

### Key decisions

**types/**: The single source of truth for types shared between frontend and backend. Both `apps/web/` and `apps/api/` import from `@blue-escrow/types`. Each app can extend these types locally in its own `types/` folder for app-specific needs. Never duplicate type definitions.

**config/**: Runtime constants that both frontend and backend need. Contract addresses change per environment (Sepolia vs mainnet). Chain configs change per network. Protocol constants (0.33% platform fee, 33-day default timeout) are defined once here and imported everywhere.

**contract-abis/**: After compiling contracts with `forge build`, ABI JSON files are copied or generated into this package. The frontend uses them with wagmi to create typed contract instances. This decouples the frontend build from the contracts compilation step. Generated files live in `generated/` and can be gitignored or committed depending on CI strategy.

**Dependency flow (correct)**:
```
apps/web  ->  packages/types, packages/config, packages/contract-abis
apps/api  ->  packages/types, packages/config, packages/contract-abis
```
Packages NEVER import from apps. Apps NEVER import from other apps.

---

## 6. DevOps — Docker, CI/CD, Nginx

Docker Compose V2 for local development and production deployment. GitHub Actions for CI/CD. Nginx as reverse proxy. DigitalOcean VPS as the deployment target.

```
apps/
  web/
    Dockerfile                  -- Multi-stage build for Next.js (deps, build, production)
  api/
    Dockerfile                  -- Multi-stage build for Express (deps, build, production)

docker/
  nginx/                        -- Nginx config (reverse proxy: /api/* -> api, /* -> web; SSL, gzip, caching)

.github/
  workflows/
    ci/                         -- CI: lint + typecheck + test + build (all apps, parallel via matrix)
    cd/                         -- CD: build images, push to registry, deploy to VPS via SSH
    contracts/                  -- Contracts pipeline: solhint, forge build --sizes, aderyn/slither, fuzz/invariant
  ISSUE_TEMPLATE/               -- Bug report, feature request templates
  PULL_REQUEST_TEMPLATE/        -- PR template with checklist
```

Compose files live at the monorepo root following Docker Compose V2 naming convention: `compose.yml` (base/dev) and `compose.prod.yml` (production overrides). Run with `docker compose up` or `docker compose -f compose.yml -f compose.prod.yml up`.

### Key decisions

**Docker Compose V2**: Uses `compose.yml` (not `docker-compose.yml`) at the monorepo root — this is the preferred filename in Compose V2. No `version:` field needed. Environment-specific overrides use `compose.prod.yml`.

**Dockerfiles co-located**: Each app contains its own `Dockerfile` (`apps/web/Dockerfile`, `apps/api/Dockerfile`) following the official Turborepo pattern. Build from root with `docker compose build` or `docker build -f apps/web/Dockerfile .`. Multi-stage builds for minimal production images (alpine). Development uses hot-reload volumes. PostgreSQL runs as a Compose service.

**Nginx**: Routes `/api/*` to the Express backend and everything else to the Next.js frontend. Handles SSL termination, gzip compression, and static asset caching with appropriate headers. Config lives in `docker/nginx/` since Nginx is infrastructure, not an app.

**CI/CD separation**: Three separate workflow groups. `ci/` runs on every push and PR (lint, typecheck, test, build for all apps). `cd/` runs on merge to main (build Docker images, deploy to VPS). `contracts/` runs when Solidity files change (full Cyfrin-standard pipeline).

**Deployment flow**: Push to main -> GitHub Actions builds Docker images -> pushes to container registry -> SSHs into DigitalOcean VPS -> pulls new images -> restarts services with `docker compose`.

---

## 7. Data Flow Overview

```
Profile/Metadata (Web2):
  Frontend  -->  REST API  -->  Prisma  -->  PostgreSQL

Deal/Financial (Web3):
  Frontend  -->  wagmi/ethers  -->  Smart Contract on Arbitrum
  (backend is NEVER involved in money movement)

Event Indexing (Sync):
  Smart Contract emits events  -->  Backend indexer listens  -->  PostgreSQL
  (read-only mirror for fast querying, NOT the source of truth)

File Storage (IPFS):
  Frontend or Backend  -->  Pinata API  -->  IPFS
  (hash stored on-chain in the deal's terms field)
```

The backend is for convenience data (profiles, searchable deal lists, middleman directory). The blockchain is for trust-critical data (funds, deal state, signatures, reputation). The indexer bridges the two by mirroring on-chain events into PostgreSQL so the frontend can query deals efficiently without scanning the blockchain directly.

---

## 8. Conventions

These rules apply to any human or AI agent working on this project:

1. **No cross-app imports**: Apps never import directly from another app. Share code through `packages/`.
2. **Feature isolation**: Features inside an app do not import from other features. Shared code lives in `shared/`, `lib/`, `hooks/`, `components/`, or `packages/`.
3. **Colocated styles**: Component styles (`.module.scss`) live alongside their `.tsx` component. Global styles live in `styles/` following ITCSS layer order.
4. **Colocated tests**: Frontend and backend test files live alongside the code they test (e.g., `auth.service.ts` and `auth.service.test.ts` in the same folder). Contract tests live in `test/` following Foundry convention (unit, integration, invariant tiers). End-to-end tests live in `e2e/` at the monorepo root using Playwright + local Anvil.
5. **Environment separation**: No hardcoded secrets, URLs, or addresses. Everything environment-dependent goes through `config/` or `packages/config/`.
6. **Single source of truth**: Types in `packages/types/`. Addresses in `packages/config/`. ABIs in `packages/contract-abis/`.
7. **Server Components by default**: In the Next.js frontend, components are Server Components unless they need interactivity (`'use client'`). Push `'use client'` boundaries to leaf nodes.
8. **BEM naming in CSS Modules**: Use BEM convention (`.block__element--modifier`) inside `.module.scss` files for predictable, self-documenting class names.
9. **Backend never touches money**: All financial operations (deposit, release, refund, fee distribution) happen exclusively on-chain. The backend only stores metadata and mirrors events.

---

## 9. Quick Reference — Complete Tree

```
blue-escrow/
  apps/
    web/                              -- Next.js frontend
      Dockerfile                      -- Multi-stage Docker build
      public/                         -- Static assets
      src/
        app/                          -- App Router (routes, layouts, pages)
          (marketing)/                -- Public pages (landing, about)
          (app)/                      -- Authenticated pages (deals, profile)
        components/
          ui/                         -- Reusable UI primitives
          layout/                     -- Header, footer, sidebar, navigation
          web3/                       -- Wallet connect, network switch
        features/
          auth/                       -- Wallet auth flow
          deals/                      -- Deal CRUD and resolution UI
          middleman/                  -- Middleman directory and registration
          profile/                    -- User profile management
          nfts/                       -- NFT gallery and viewers
        hooks/                        -- Global shared hooks
        lib/
          web3/                       -- wagmi config, contracts, chains
          api/                        -- REST client, endpoints
          utils/                      -- Formatting, validation, dates
        styles/
          settings/                   -- ITCSS L1: Variables, tokens
          tools/                      -- ITCSS L2: Mixins, functions
          generic/                    -- ITCSS L3: Reset, normalize
          elements/                   -- ITCSS L4: HTML element styles
          objects/                    -- ITCSS L5: Layout patterns
          utilities/                  -- ITCSS L7: Helper classes
        animations/
          config/                     -- Plugin registration, defaults, matchMedia
          hooks/                      -- useRevealOnScroll, useParallax, useSplitText
          presets/                    -- fadeIn, slideUp, staggerChildren
          scrollTrigger/              -- Pin, parallax, scrub configs
          timelines/                  -- Complex sequences
        providers/                    -- React context providers
        constants/                    -- Frontend constants
        types/                        -- Frontend-specific types
    api/                              -- Express backend
      Dockerfile                      -- Multi-stage Docker build
      src/
        config/                       -- Env validation, DB, JWT, CORS
        shared/
          middleware/                 -- Auth, validation, errors, rate limit
          errors/                     -- Custom error classes
          validators/                 -- Zod schemas
          guards/                     -- Role-based, ownership checks
          utils/                      -- Logger, crypto, response helpers
          types/                      -- Backend-specific types
        features/
          auth/                       -- Wallet signature + JWT
          users/                      -- Profile CRUD
          middlemen/                  -- Registry, directory, stats
          deals/                      -- Metadata indexing
          nfts/                       -- tokenURI metadata endpoint
        integrations/
          blockchain/                 -- Event indexer, contract reads
          ipfs/                       -- Pinata upload/retrieval
        constants/                    -- Pagination, nonce expiry, JWT duration
        prisma/                       -- Schema, migrations, seeds
        docs/                         -- Swagger/OpenAPI config
    contracts/                        -- Foundry smart contracts
      src/
        interfaces/                   -- Contract interfaces
        abstract/                     -- Base contracts with shared logic
        libraries/                    -- Solidity libraries (math, validation, state)
        core/                         -- Escrow + Factory contracts
        tokens/                       -- ReceiptNFT + SoulboundNFT
        registry/                     -- Middleman registry + fee config
        types/                        -- Shared structs + enums (Deal, Resolution)
        utils/                        -- Custom errors + events
      test/
        unit/                         -- Per-contract unit tests (stateless fuzz)
        integration/                  -- Multi-contract flow tests
        invariant/                    -- Stateful fuzz, protocol invariants
        mocks/                        -- Mock contracts (MockUSDC, etc.)
      script/
        deploy/                       -- Deployment scripts (Sepolia + mainnet)
        interact/                     -- Post-deploy interaction scripts
      lib/                            -- Foundry deps (forge-std, OpenZeppelin)
  packages/
    types/                            -- Shared TS types (frontend + backend)
      src/
        deals/                        -- Deal types
        users/                        -- User/middleman types
        contracts/                    -- Event/tx types
        api/                          -- Request/response types
    config/                           -- Shared runtime config
      src/
        addresses/                    -- Contract addresses per chain
        chains/                       -- Chain config (RPC, explorer, ID)
        constants/                    -- Protocol constants (fees, timeouts)
        enums/                        -- Shared enums (DealState, UserRole)
    contract-abis/                    -- Generated ABIs + TS bindings
      src/
        generated/                    -- Foundry compilation output
    tsconfig/                         -- Shared TS configs (base, nextjs, node)
    eslint-config/                    -- Shared ESLint configs
  e2e/                                -- Playwright + Anvil end-to-end tests
  docker/
    nginx/                            -- Nginx reverse proxy config
  .github/
    workflows/
      ci/                             -- Lint, test, build (all apps)
      cd/                             -- Deploy to VPS
      contracts/                      -- Solhint, forge sizes, slither, fuzz
    ISSUE_TEMPLATE/                   -- Bug, feature templates
    PULL_REQUEST_TEMPLATE/            -- PR checklist
```
