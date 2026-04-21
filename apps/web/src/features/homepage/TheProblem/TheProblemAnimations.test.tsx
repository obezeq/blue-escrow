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

import { TheProblemAnimations } from './TheProblemAnimations';

afterEach(() => cleanup());

describe('TheProblemAnimations', () => {
  it('renders children content', () => {
    render(
      <TheProblemAnimations>
        <h2>Test Heading</h2>
        <p>Test paragraph</p>
      </TheProblemAnimations>,
    );
    expect(screen.getByText('Test Heading')).toBeDefined();
    expect(screen.getByText('Test paragraph')).toBeDefined();
  });

  it('wraps children in a div container', () => {
    const { container } = render(
      <TheProblemAnimations>
        <span>Child</span>
      </TheProblemAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('preserves child elements for SSR accessibility', () => {
    render(
      <TheProblemAnimations>
        <p aria-label="$2.1 billion">
          <span>$2.1B</span>
        </p>
      </TheProblemAnimations>,
    );
    expect(screen.getByLabelText('$2.1 billion')).toBeDefined();
    expect(screen.getByText('$2.1B')).toBeDefined();
  });
});
