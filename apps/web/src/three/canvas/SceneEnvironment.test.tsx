import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { mockProviders, ThreeTestCanvas } from '@/test/three-wrapper';

mockProviders();

import { SceneEnvironment } from './SceneEnvironment';

describe('SceneEnvironment', () => {
  it('mounts without crashing', () => {
    expect(() => {
      render(
        <ThreeTestCanvas>
          <SceneEnvironment />
        </ThreeTestCanvas>,
      );
    }).not.toThrow();
  });
});
