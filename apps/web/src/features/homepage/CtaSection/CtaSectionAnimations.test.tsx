import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    matchMedia: () => ({ add: vi.fn() }),
    set: vi.fn(),
    from: vi.fn(),
  },
  SplitText: { create: vi.fn() },
  useGSAP: vi.fn(),
}));

import { CtaSectionAnimations } from './CtaSectionAnimations';

afterEach(cleanup);

describe('CtaSectionAnimations', () => {
  it('renders children', () => {
    render(
      <CtaSectionAnimations>
        <p>Test content</p>
      </CtaSectionAnimations>,
    );
    expect(screen.getByText('Test content')).toBeDefined();
  });

  it('wraps children in a div', () => {
    const { container } = render(
      <CtaSectionAnimations>
        <p>Child</p>
      </CtaSectionAnimations>,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.tagName).toBe('DIV');
    expect(wrapper?.querySelector('p')?.textContent).toBe('Child');
  });
});
