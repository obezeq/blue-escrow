import { describe, expect, it } from 'vitest';
import { prisma } from './client.js';

describe('prisma client singleton', () => {
  it('exposes all 9 schema models on the client', () => {
    // Spot-check: the generated client picks up every model declared in
    // schema.prisma. Names are camelCased model names (Prisma convention).
    const expected = [
      'user',
      'middlemanProfile',
      'siweNonce',
      'revokedJti',
      'dealMetadata',
      'nftMetadataCache',
      'indexerCursor',
      'indexedEvent',
      'indexerError',
    ] as const;
    for (const m of expected) expect(prisma).toHaveProperty(m);
  });

  it('has $transaction available for the BEGIN/ROLLBACK helper', () => {
    expect(typeof prisma.$transaction).toBe('function');
  });
});
