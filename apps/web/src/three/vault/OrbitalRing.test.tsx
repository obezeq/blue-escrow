import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { mockProviders, ThreeTestCanvas } from '@/test/three-wrapper';

mockProviders();

import { OrbitalRings } from './OrbitalRing';

describe('OrbitalRings', () => {
  it('mounts without crashing', () => {
    expect(() => {
      render(
        <ThreeTestCanvas>
          <OrbitalRings />
        </ThreeTestCanvas>,
      );
    }).not.toThrow();
  });

  it('mounts in reduced motion mode', () => {
    expect(() => {
      render(
        <ThreeTestCanvas>
          <OrbitalRings reducedMotion={true} />
        </ThreeTestCanvas>,
      );
    }).not.toThrow();
  });
});
