import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { mockProviders, ThreeTestCanvas } from '@/test/three-wrapper';

mockProviders();

import { VaultParticles } from './VaultParticles';

describe('VaultParticles', () => {
  it('mounts without crashing', () => {
    expect(() => {
      render(
        <ThreeTestCanvas>
          <VaultParticles count={100} reducedMotion={false} />
        </ThreeTestCanvas>,
      );
    }).not.toThrow();
  });

  it('mounts in reduced motion mode', () => {
    expect(() => {
      render(
        <ThreeTestCanvas>
          <VaultParticles count={100} reducedMotion={true} />
        </ThreeTestCanvas>,
      );
    }).not.toThrow();
  });
});
