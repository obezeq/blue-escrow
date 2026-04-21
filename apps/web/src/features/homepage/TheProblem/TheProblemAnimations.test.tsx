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

import { TheProblemAnimations } from './TheProblemAnimations';

afterEach(cleanup);

describe('TheProblemAnimations', () => {
  it('renders children', () => {
    render(
      <TheProblemAnimations>
        <p>Test paragraph</p>
      </TheProblemAnimations>,
    );
    expect(screen.getByText('Test paragraph')).toBeDefined();
  });

  it('wraps children in a div', () => {
    const { container } = render(
      <TheProblemAnimations>
        <span>Child</span>
      </TheProblemAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});
