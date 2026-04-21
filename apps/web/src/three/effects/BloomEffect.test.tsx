import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { mockProviders, ThreeTestCanvas } from '@/test/three-wrapper';

mockProviders();

import { BloomEffect } from './BloomEffect';

describe('BloomEffect', () => {
  it('mounts without crashing when enabled', () => {
    expect(() => {
      render(
        <ThreeTestCanvas>
          <BloomEffect enabled={true} />
        </ThreeTestCanvas>,
      );
    }).not.toThrow();
  });

  it('mounts without crashing when disabled', () => {
    expect(() => {
      render(
        <ThreeTestCanvas>
          <BloomEffect enabled={false} />
        </ThreeTestCanvas>,
      );
    }).not.toThrow();
  });
});
