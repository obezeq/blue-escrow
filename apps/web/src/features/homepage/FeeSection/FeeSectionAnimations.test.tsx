import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    matchMedia: () => ({ add: vi.fn() }),
    from: vi.fn(),
    set: vi.fn(),
  },
  useGSAP: vi.fn(),
}));

import { FeeSectionAnimations } from './FeeSectionAnimations';

afterEach(cleanup);

describe('FeeSectionAnimations', () => {
  it('renders children', () => {
    render(
      <FeeSectionAnimations>
        <p>0.33%</p>
      </FeeSectionAnimations>,
    );
    expect(screen.getByText('0.33%')).toBeDefined();
  });

  it('wraps children in a div', () => {
    const { container } = render(
      <FeeSectionAnimations>
        <span>Child</span>
      </FeeSectionAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});
