import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { createRef } from 'react';

vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    matchMedia: () => ({ add: vi.fn() }),
    from: vi.fn(),
    set: vi.fn(),
  },
  ScrollTrigger: {
    create: vi.fn(() => ({ kill: vi.fn() })),
  },
  useGSAP: vi.fn(),
}));

import { HowItWorksAnimations } from './HowItWorksAnimations';

afterEach(cleanup);

describe('HowItWorksAnimations', () => {
  it('renders children', () => {
    const stageRef = createRef<HTMLDivElement>();
    render(
      <HowItWorksAnimations stageRef={stageRef} onPhaseChange={() => {}}>
        <p>How it works content</p>
      </HowItWorksAnimations>,
    );
    expect(screen.getByText('How it works content')).toBeDefined();
  });

  it('wraps children in a div', () => {
    const stageRef = createRef<HTMLDivElement>();
    const { container } = render(
      <HowItWorksAnimations stageRef={stageRef} onPhaseChange={() => {}}>
        <span>Child</span>
      </HowItWorksAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});
