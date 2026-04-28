-- Widen siwe_nonce.nonce from VARCHAR(64) to VARCHAR(96).
--
-- viem's generateSiweNonce() (the canonical EIP-4361 nonce generator we
-- use in S03's auth.repository) returns 96-char base16 strings. The
-- original column type from 0001_init truncated those, causing
-- "value too long for the column's type" errors at insert. PostgreSQL
-- widens VARCHAR in-place without data rewrite.

ALTER TABLE "siwe_nonce" ALTER COLUMN "nonce" TYPE VARCHAR(96);
