import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { mockProviders, ThreeTestCanvas } from '@/test/three-wrapper';

mockProviders();

import { VaultGeometry } from './VaultGeometry';

describe('VaultGeometry', () => {
  it('mounts without crashing', () => {
    expect(() => {
      render(
        <ThreeTestCanvas>
          <VaultGeometry />
        </ThreeTestCanvas>,
      );
    }).not.toThrow();
  });

  it('mounts in reduced motion mode', () => {
    expect(() => {
      render(
        <ThreeTestCanvas>
          <VaultGeometry reducedMotion={true} />
        </ThreeTestCanvas>,
      );
    }).not.toThrow();
  });
});
