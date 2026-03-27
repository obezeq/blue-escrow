import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock GSAP
vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    matchMedia: () => ({
      add: vi.fn(),
    }),
    from: vi.fn(),
  },
  SplitText: {
    create: vi.fn(),
  },
  useGSAP: vi.fn(),
}));

import { HeroAnimations } from './HeroAnimations';

afterEach(() => cleanup());

describe('HeroAnimations', () => {
  it('renders children content', () => {
    render(
      <HeroAnimations>
        <h1>Test Heading</h1>
        <p>Test paragraph</p>
      </HeroAnimations>,
    );
    expect(screen.getByText('Test Heading')).toBeDefined();
    expect(screen.getByText('Test paragraph')).toBeDefined();
  });

  it('wraps children in a div container', () => {
    const { container } = render(
      <HeroAnimations>
        <span>Child</span>
      </HeroAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('preserves child elements for SSR accessibility', () => {
    render(
      <HeroAnimations>
        <h1>Money flows. Trust stays.</h1>
        <a href="/app/deals/new">Start a deal</a>
      </HeroAnimations>,
    );
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeDefined();
    const link = screen.getByRole('link', { name: 'Start a deal' });
    expect(link.getAttribute('href')).toBe('/app/deals/new');
  });
});
