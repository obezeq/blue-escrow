import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock GSAP
vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    matchMedia: () => ({
      add: vi.fn(),
    }),
    from: vi.fn(),
    to: vi.fn(),
    set: vi.fn(),
    fromTo: vi.fn(),
  },
  useGSAP: vi.fn(),
}));

import { FeeSectionAnimations } from './FeeSectionAnimations';

afterEach(() => cleanup());

describe('FeeSectionAnimations', () => {
  it('renders children content', () => {
    render(
      <FeeSectionAnimations>
        <p>0.33%</p>
      </FeeSectionAnimations>,
    );
    expect(screen.getByText('0.33%')).toBeDefined();
  });

  it('wraps children in a div container', () => {
    const { container } = render(
      <FeeSectionAnimations>
        <span>Child</span>
      </FeeSectionAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('preserves child elements for SSR accessibility', () => {
    render(
      <FeeSectionAnimations>
        <p aria-label="0.33 percent">0.33%</p>
      </FeeSectionAnimations>,
    );
    expect(screen.getByLabelText('0.33 percent')).toBeDefined();
  });
});
