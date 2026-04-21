import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    matchMedia: () => ({ add: vi.fn() }),
    from: vi.fn(),
    to: vi.fn(),
    set: vi.fn(),
  },
  useGSAP: vi.fn(),
}));

import { HeroAnimations } from './HeroAnimations';

afterEach(cleanup);

describe('HeroAnimations', () => {
  it('renders children', () => {
    render(
      <HeroAnimations>
        <h1>Test Heading</h1>
      </HeroAnimations>,
    );
    expect(screen.getByText('Test Heading')).toBeDefined();
  });

  it('wraps children in a div', () => {
    const { container } = render(
      <HeroAnimations>
        <span>Child</span>
      </HeroAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});
