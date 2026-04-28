// Dev-only seed. Upserts two anvil-mnemonic accounts as Users plus one
// inactive MiddlemanProfile. The indexer (S07) flips `active` after it
// observes a MiddlemanRegistered event, so leaving it false here mirrors
// reality on a fresh chain.
//
// Run via `pnpm --filter @blue-escrow/api prisma:seed`.

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

if (process.env.NODE_ENV === 'production') {
  throw new Error('seed not allowed in production');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for seeding');

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// Default foundry/anvil mnemonic — accounts 0..2.
const ANVIL_0 = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const ANVIL_1 = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
const ANVIL_2 = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';

async function main() {
  await prisma.user.upsert({
    where: { addressLower: ANVIL_0 },
    update: {},
    create: { addressLower: ANVIL_0, displayName: 'anvil-0 (client demo)' },
  });

  await prisma.user.upsert({
    where: { addressLower: ANVIL_1 },
    update: {},
    create: { addressLower: ANVIL_1, displayName: 'anvil-1 (seller demo)' },
  });

  await prisma.user.upsert({
    where: { addressLower: ANVIL_2 },
    update: {},
    create: { addressLower: ANVIL_2, displayName: 'anvil-2 (middleman demo)' },
  });

  await prisma.middlemanProfile.upsert({
    where: { addressLower: ANVIL_2 },
    update: {},
    create: {
      addressLower: ANVIL_2,
      commissionPctBps: 250, // 2.5%
      active: false,         // indexer would flip this on MiddlemanRegistered
      contactLink: 'https://example.test/middleman/anvil-2',
    },
  });
}

await main()
  .then(async () => {
    await prisma.$disconnect();
    process.stdout.write('seed: ok\n');
  })
  .catch(async (e: unknown) => {
    await prisma.$disconnect();
    process.stderr.write(`seed: failed — ${(e as Error).message}\n`);
    process.exit(1);
  });
