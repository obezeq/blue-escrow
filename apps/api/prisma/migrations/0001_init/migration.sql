-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DealState" AS ENUM ('Created', 'Joined', 'Signed', 'Funded', 'DeliveryConfirmed', 'RefundRequested', 'Disputed', 'Resolved', 'TimedOut');

-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('None', 'Delivery', 'Refund', 'MiddlemanBuyer', 'MiddlemanSeller', 'Timeout');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('Client', 'Seller', 'Middleman');

-- CreateEnum
CREATE TYPE "IndexedEventStatus" AS ENUM ('Pending', 'Confirmed', 'Reorged');

-- CreateTable
CREATE TABLE "users" (
    "addressLower" VARCHAR(42) NOT NULL,
    "displayName" VARCHAR(64),
    "bio" VARCHAR(280),
    "avatarPath" VARCHAR(255),
    "externalLink" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("addressLower")
);

-- CreateTable
CREATE TABLE "middleman_profile" (
    "addressLower" VARCHAR(42) NOT NULL,
    "commissionPctBps" SMALLINT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "contactLink" VARCHAR(255),
    "dealsCount" INTEGER NOT NULL DEFAULT 0,
    "disputesCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DECIMAL(5,4),
    "registeredAtBlock" BIGINT,
    "registeredAtTx" VARCHAR(66),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "middleman_profile_pkey" PRIMARY KEY ("addressLower")
);

-- CreateTable
CREATE TABLE "siwe_nonce" (
    "nonce" VARCHAR(64) NOT NULL,
    "addressLower" VARCHAR(42) NOT NULL,
    "domain" VARCHAR(64) NOT NULL,
    "issuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "consumedAt" TIMESTAMPTZ(6),

    CONSTRAINT "siwe_nonce_pkey" PRIMARY KEY ("nonce")
);

-- CreateTable
CREATE TABLE "revoked_jti" (
    "jti" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" VARCHAR(64),

    CONSTRAINT "revoked_jti_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "deal_metadata" (
    "chainId" INTEGER NOT NULL,
    "contractAddress" VARCHAR(42) NOT NULL,
    "dealId" BIGINT NOT NULL,
    "state" "DealState" NOT NULL DEFAULT 'Created',
    "termsOfServiceText" TEXT,
    "termsHash" VARCHAR(66),
    "participantsJson" JSONB NOT NULL,
    "amountWei" DECIMAL(78,0),
    "paymentToken" VARCHAR(42),
    "middlemanAddress" VARCHAR(42),
    "resolutionType" "ResolutionType",
    "createdAtBlock" BIGINT,
    "createdAtTx" VARCHAR(66),
    "lastEventAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "deal_metadata_pkey" PRIMARY KEY ("chainId","contractAddress","dealId")
);

-- CreateTable
CREATE TABLE "nft_metadata_cache" (
    "chainId" INTEGER NOT NULL,
    "contractAddress" VARCHAR(42) NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" VARCHAR(255),
    "attributesJson" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "nft_metadata_cache_pkey" PRIMARY KEY ("chainId","contractAddress","tokenId")
);

-- CreateTable
CREATE TABLE "indexer_cursor" (
    "chainId" INTEGER NOT NULL,
    "contractAddress" VARCHAR(42) NOT NULL,
    "lastSafeBlock" BIGINT NOT NULL,
    "lastFinalizedBlock" BIGINT NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "indexer_cursor_pkey" PRIMARY KEY ("chainId","contractAddress")
);

-- CreateTable
CREATE TABLE "indexed_event" (
    "id" BIGSERIAL NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" VARCHAR(42) NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" VARCHAR(66) NOT NULL,
    "txHash" VARCHAR(66) NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "eventName" VARCHAR(64) NOT NULL,
    "argsJson" JSONB NOT NULL,
    "status" "IndexedEventStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indexed_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indexer_error" (
    "id" BIGSERIAL NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" VARCHAR(42) NOT NULL,
    "blockNumber" BIGINT,
    "txHash" VARCHAR(66),
    "logIndex" INTEGER,
    "errorCode" VARCHAR(64) NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "contextJson" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indexer_error_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "middleman_profile_active_idx" ON "middleman_profile"("active");

-- CreateIndex
CREATE INDEX "siwe_nonce_addressLower_idx" ON "siwe_nonce"("addressLower");

-- CreateIndex
CREATE INDEX "siwe_nonce_expiresAt_idx" ON "siwe_nonce"("expiresAt");

-- CreateIndex
CREATE INDEX "revoked_jti_expiresAt_idx" ON "revoked_jti"("expiresAt");

-- CreateIndex
CREATE INDEX "deal_metadata_state_idx" ON "deal_metadata"("state");

-- CreateIndex
CREATE INDEX "deal_metadata_middlemanAddress_idx" ON "deal_metadata"("middlemanAddress");

-- CreateIndex
CREATE INDEX "indexed_event_chainId_contractAddress_blockNumber_idx" ON "indexed_event"("chainId", "contractAddress", "blockNumber");

-- CreateIndex
CREATE INDEX "indexed_event_chainId_contractAddress_eventName_idx" ON "indexed_event"("chainId", "contractAddress", "eventName");

-- CreateIndex
CREATE INDEX "indexed_event_status_idx" ON "indexed_event"("status");

-- CreateIndex
CREATE UNIQUE INDEX "indexed_event_chainId_txHash_logIndex_key" ON "indexed_event"("chainId", "txHash", "logIndex");

-- CreateIndex
CREATE INDEX "indexer_error_chainId_contractAddress_idx" ON "indexer_error"("chainId", "contractAddress");

-- CreateIndex
CREATE INDEX "indexer_error_createdAt_idx" ON "indexer_error"("createdAt");

-- AddForeignKey
ALTER TABLE "middleman_profile" ADD CONSTRAINT "middleman_profile_addressLower_fkey" FOREIGN KEY ("addressLower") REFERENCES "users"("addressLower") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================================
-- Manual GIN indexes for JSONB containment queries.
-- Prisma cannot express jsonb_path_ops in @@index yet — added by hand.
-- Keep these in sync if jsonb columns are added/renamed in future migrations.
-- ============================================================================
CREATE INDEX "deal_metadata_participants_gin"
  ON "deal_metadata" USING GIN ("participantsJson" jsonb_path_ops);

CREATE INDEX "indexed_event_args_gin"
  ON "indexed_event"  USING GIN ("argsJson"        jsonb_path_ops);
