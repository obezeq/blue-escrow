import { describe, expect, it } from 'vitest';
import './bigint.js';

describe('BigInt JSON polyfill', () => {
  it('serializes a top-level BigInt as its string value', () => {
    expect(JSON.stringify(123n)).toBe('"123"');
  });

  it('serializes a uint256-sized BigInt without precision loss', () => {
    const huge = 2n ** 256n - 1n; // max uint256
    expect(JSON.stringify({ amount: huge })).toBe(`{"amount":"${huge.toString()}"}`);
  });

  it('serializes nested BigInts inside arrays and objects', () => {
    const payload = { ids: [1n, 2n, 3n], meta: { lastBlock: 999_999_999_999n } };
    expect(JSON.parse(JSON.stringify(payload))).toEqual({
      ids: ['1', '2', '3'],
      meta: { lastBlock: '999999999999' },
    });
  });
});
