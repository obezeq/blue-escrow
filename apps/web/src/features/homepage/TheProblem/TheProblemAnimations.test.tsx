import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type * as ReactModule from 'react';

const { gsapFrom, gsapSet, mmAdd, splitCreateCalls, splitReverts } = vi.hoisted(() => ({
  gsapFrom: vi.fn(),
  gsapSet: vi.fn(),
  mmAdd: vi.fn(),
  splitCreateCalls: [] as Array<{ words: unknown[]; revert: () => void }>,
  splitReverts: vi.fn(),
}));

vi.mock('@/animations/config/gsap-register', async () => {
  const React = await vi.importActual<typeof ReactModule>('react');
  return {
    gsap: {
      matchMedia: () => ({ add: mmAdd }),
      from: gsapFrom,
      set: gsapSet,
    },
    SplitText: {
      create: vi.fn(() => {
        const self = {
          words: [] as unknown[],
          revert: () => splitReverts(),
        };
        splitCreateCalls.push(self);
        return self;
      }),
    },
    useGSAP: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanupFn = cb();
        return typeof cleanupFn === 'function' ? cleanupFn : undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});

import { TheProblemAnimations } from './TheProblemAnimations';

afterEach(() => {
  cleanup();
  gsapFrom.mockClear();
  gsapSet.mockClear();
  mmAdd.mockClear();
  splitCreateCalls.length = 0;
  splitReverts.mockClear();
});

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

  it('creates one SplitText per [data-animate="line"] inside no-reduced-motion', () => {
    render(
      <TheProblemAnimations>
        <p data-animate="line">line one</p>
        <p data-animate="line">line two</p>
        <p data-animate="line">line three</p>
      </TheProblemAnimations>,
    );

    const noRmEntry = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: no-preference)',
    );
    expect(noRmEntry).toBeDefined();
    (noRmEntry![1] as () => void)();

    expect(splitCreateCalls.length).toBe(3);
  });

  it('passes a clipPath inset to gsap.from for each line', () => {
    render(
      <TheProblemAnimations>
        <p data-animate="line">only line</p>
      </TheProblemAnimations>,
    );
    const noRmEntry = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: no-preference)',
    );
    (noRmEntry![1] as () => void)();

    const clipCall = gsapFrom.mock.calls.find(
      ([, vars]) =>
        (vars as { clipPath?: string } | undefined)?.clipPath ===
        'inset(0 100% 0 0)',
    );
    expect(clipCall).toBeDefined();
  });

  it('reverts every SplitText instance on unmount', () => {
    const { unmount } = render(
      <TheProblemAnimations>
        <p data-animate="line">a</p>
        <p data-animate="line">b</p>
      </TheProblemAnimations>,
    );
    const noRmEntry = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: no-preference)',
    );
    (noRmEntry![1] as () => void)();

    expect(splitReverts).not.toHaveBeenCalled();
    unmount();
    expect(splitReverts).toHaveBeenCalledTimes(2);
  });
});
