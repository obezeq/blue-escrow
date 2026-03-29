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
  useGSAP: vi.fn(),
}));

vi.mock('@/animations/scrollTrigger/pinnedSection', () => ({
  createPinnedTimeline: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    to: vi.fn().mockReturnThis(),
  })),
}));

import { HowItWorksAnimations } from './HowItWorksAnimations';

afterEach(() => cleanup());

describe('HowItWorksAnimations', () => {
  it('renders children content', () => {
    render(
      <HowItWorksAnimations>
        <h2>How it works</h2>
        <p>Step text</p>
      </HowItWorksAnimations>,
    );
    expect(screen.getByText('How it works')).toBeDefined();
    expect(screen.getByText('Step text')).toBeDefined();
  });

  it('wraps children in a div container', () => {
    const { container } = render(
      <HowItWorksAnimations>
        <span>Child</span>
      </HowItWorksAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('preserves child elements for SSR accessibility', () => {
    render(
      <HowItWorksAnimations>
        <h2>How it works</h2>
        <ol>
          <li>Create</li>
          <li>Sign</li>
        </ol>
      </HowItWorksAnimations>,
    );
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeDefined();
    expect(screen.getByRole('list')).toBeDefined();
  });
});
