// Meta test — guards against accidental model/enum deletion or rename.
// Reads schema.prisma directly rather than introspecting the generated
// client because the generator could happily emit an out-of-date but
// internally-consistent client; we want the source-of-truth file to break
// the build the moment the contract drifts.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(path.join(here, 'schema.prisma'), 'utf8');

const expectedModels = [
  'User',
  'MiddlemanProfile',
  'SiweNonce',
  'RevokedJti',
  'DealMetadata',
  'NftMetadataCache',
  'IndexerCursor',
  'IndexedEvent',
  'IndexerError',
] as const;

const expectedEnums = [
  'DealState',
  'ResolutionType',
  'ParticipantRole',
  'IndexedEventStatus',
] as const;

describe('schema.prisma contract', () => {
  it.each(expectedModels)('declares model %s', (name) => {
    expect(schema).toMatch(new RegExp(`^model ${name} \\{`, 'm'));
  });

  it.each(expectedEnums)('declares enum %s', (name) => {
    expect(schema).toMatch(new RegExp(`^enum ${name} \\{`, 'm'));
  });

  it('uses the prisma-client (not legacy prisma-client-js) generator', () => {
    expect(schema).toMatch(/provider\s*=\s*"prisma-client"/);
    expect(schema).not.toMatch(/provider\s*=\s*"prisma-client-js"/);
  });

  it('does NOT inline the datasource URL (Prisma 7 forbids it)', () => {
    expect(schema).not.toMatch(/url\s*=\s*env\("DATABASE_URL"\)/);
  });

  it('declares the four PrismaJson type comments', () => {
    expect(schema).toMatch(/\/\/\/ \[DealParticipants\]/);
    expect(schema).toMatch(/\/\/\/ \[NftAttributes\]/);
    expect(schema).toMatch(/\/\/\/ \[IndexedEventArgs\]/);
    expect(schema).toMatch(/\/\/\/ \[IndexerErrorContext\]/);
  });
});
