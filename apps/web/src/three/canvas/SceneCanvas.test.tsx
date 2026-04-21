import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { mockProviders } from '@/test/three-wrapper';

mockProviders();

import SceneCanvas from './SceneCanvas';

describe('SceneCanvas', () => {
  it('mounts without crashing', () => {
    expect(() => {
      render(<SceneCanvas />);
    }).not.toThrow();
  });
});
