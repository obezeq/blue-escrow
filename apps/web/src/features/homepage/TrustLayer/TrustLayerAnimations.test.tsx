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
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
    })),
  },
  useGSAP: vi.fn(),
}));

import { TrustLayerAnimations } from './TrustLayerAnimations';

afterEach(() => cleanup());

describe('TrustLayerAnimations', () => {
  it('renders children content', () => {
    render(
      <TrustLayerAnimations>
        <h2>Test Heading</h2>
        <p>Test paragraph</p>
      </TrustLayerAnimations>,
    );
    expect(screen.getByText('Test Heading')).toBeDefined();
    expect(screen.getByText('Test paragraph')).toBeDefined();
  });

  it('wraps children in a div container', () => {
    const { container } = render(
      <TrustLayerAnimations>
        <span>Child</span>
      </TrustLayerAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('preserves child elements for SSR accessibility', () => {
    render(
      <TrustLayerAnimations>
        <pre>
          <code>function resolve</code>
        </pre>
      </TrustLayerAnimations>,
    );
    expect(screen.getByText('function resolve')).toBeDefined();
  });
});
