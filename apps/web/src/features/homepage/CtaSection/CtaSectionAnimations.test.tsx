import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type * as ReactModule from 'react';

// Hoisted so the module factory sees them. Each `SplitText.create` call
// returns an object that tracks its own `revert()` invocations — this
// lets the test assert the cleanup path fires `revert()` on unmount.
const { splitCreateCalls, splitReverts, matchMediaAddSpy } = vi.hoisted(() => ({
  splitCreateCalls: [] as Array<{ revert: () => void; words: unknown[] }>,
  splitReverts: vi.fn(),
  matchMediaAddSpy: vi.fn(),
}));

vi.mock('@/animations/config/gsap-register', async () => {
  const React = await vi.importActual<typeof ReactModule>('react');
  return {
    gsap: {
      matchMedia: () => ({ add: matchMediaAddSpy }),
      set: vi.fn(),
      from: vi.fn(),
      fromTo: vi.fn(),
    },
    SplitText: {
      create: vi.fn((_target, opts: { onSplit?: (self: unknown) => unknown }) => {
        const self = {
          words: [],
          revert: () => splitReverts(),
        };
        splitCreateCalls.push(self);
        // Mirror the real lib's contract: `onSplit` fires synchronously
        // on create, so the outer `split` capture is set.
        opts.onSplit?.(self);
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

import { CtaSectionAnimations } from './CtaSectionAnimations';

afterEach(() => {
  cleanup();
  splitCreateCalls.length = 0;
  splitReverts.mockClear();
  matchMediaAddSpy.mockClear();
});

// Drive the captured no-reduced-motion callback so the SplitText.create
// branch actually runs under the test. We pick the MOST RECENT matching
// entry because multiple mount cycles in one test accumulate calls on
// the hoisted spy.
function runNoReducedMotion() {
  const entries = matchMediaAddSpy.mock.calls.filter(
    ([q]) => q === '(prefers-reduced-motion: no-preference)',
  );
  const entry = entries[entries.length - 1];
  if (!entry) return;
  (entry[1] as () => void)();
}

describe('CtaSectionAnimations — markup', () => {
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

describe('CtaSectionAnimations — SplitText lifecycle', () => {
  it('creates one SplitText per mount when the heading is present', () => {
    render(
      <CtaSectionAnimations>
        <h2 data-animate="heading">Ready to settle?</h2>
      </CtaSectionAnimations>,
    );
    runNoReducedMotion();
    expect(splitCreateCalls.length).toBe(1);
  });

  it('reverts the SplitText on unmount (no duplicate spans on remount)', () => {
    const { unmount } = render(
      <CtaSectionAnimations>
        <h2 data-animate="heading">Ready to settle?</h2>
      </CtaSectionAnimations>,
    );
    runNoReducedMotion();
    expect(splitReverts).not.toHaveBeenCalled();
    unmount();
    expect(splitReverts).toHaveBeenCalledTimes(1);
  });

  it('each mount creates a fresh split and its revert path is hit on unmount', () => {
    // First mount/unmount cycle.
    const first = render(
      <CtaSectionAnimations>
        <h2 data-animate="heading">A</h2>
      </CtaSectionAnimations>,
    );
    runNoReducedMotion();
    first.unmount();
    expect(splitReverts).toHaveBeenCalledTimes(1);

    // Second independent mount/unmount: still a single additional revert.
    const second = render(
      <CtaSectionAnimations>
        <h2 data-animate="heading">B</h2>
      </CtaSectionAnimations>,
    );
    runNoReducedMotion();
    second.unmount();
    expect(splitReverts).toHaveBeenCalledTimes(2);
    // Two mounts -> two creations total.
    expect(splitCreateCalls.length).toBe(2);
  });
});
