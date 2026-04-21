import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock GSAP
vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    matchMedia: () => ({
      add: vi.fn(),
    }),
    from: vi.fn(),
    set: vi.fn(),
  },
  SplitText: {
    create: vi.fn(),
  },
  useGSAP: vi.fn(),
}));

vi.mock('@/animations/scrollTrigger/pinnedSection', () => ({
  createPinnedTimeline: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    to: vi.fn().mockReturnThis(),
  })),
}));

import { TheSolutionAnimations } from './TheSolutionAnimations';

afterEach(() => cleanup());

describe('TheSolutionAnimations', () => {
  it('renders children content', () => {
    render(
      <TheSolutionAnimations>
        <h2>Nobody holds the key.</h2>
        <p>Lock text</p>
      </TheSolutionAnimations>,
    );
    expect(screen.getByText('Nobody holds the key.')).toBeDefined();
    expect(screen.getByText('Lock text')).toBeDefined();
  });

  it('wraps children in a div container', () => {
    const { container } = render(
      <TheSolutionAnimations>
        <span>Child</span>
      </TheSolutionAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('preserves child elements for SSR accessibility', () => {
    render(
      <TheSolutionAnimations>
        <h2>Nobody holds the key.</h2>
        <p>Protected by the blockchain. Not by promises.</p>
      </TheSolutionAnimations>,
    );
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeDefined();
    expect(
      screen.getByText('Protected by the blockchain. Not by promises.'),
    ).toBeDefined();
  });
});
