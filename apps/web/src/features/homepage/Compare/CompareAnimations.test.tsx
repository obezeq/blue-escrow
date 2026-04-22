import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type * as ReactModule from 'react';

const { gsapFrom, gsapSet, mmAdd } = vi.hoisted(() => ({
  gsapFrom: vi.fn(),
  gsapSet: vi.fn(),
  mmAdd: vi.fn(),
}));

vi.mock('@/animations/config/gsap-register', async () => {
  const React = await vi.importActual<typeof ReactModule>('react');
  return {
    gsap: {
      matchMedia: () => ({ add: mmAdd }),
      from: gsapFrom,
      set: gsapSet,
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

import { CompareAnimations } from './CompareAnimations';

// Helper: stub `window.matchMedia` so the coarse-pointer fork can be
// toggled per-test. jsdom's default matchMedia always returns matches:
// false, but the code also probes `(pointer: coarse)` — we need finer
// control.
function installMatchMedia(matchers: Record<string, boolean>) {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matchers[query] ?? false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = originalMatchMedia;
  };
}

afterEach(() => {
  cleanup();
  gsapFrom.mockClear();
  gsapSet.mockClear();
  mmAdd.mockClear();
});

describe('CompareAnimations', () => {
  let restoreMatchMedia = () => {};
  beforeEach(() => {
    // Default: fine pointer (desktop) → 3D path active.
    restoreMatchMedia = installMatchMedia({ '(pointer: coarse)': false });
  });
  afterEach(() => restoreMatchMedia());

  it('renders children', () => {
    render(
      <CompareAnimations>
        <table>
          <tbody>
            <tr>
              <td>cell</td>
            </tr>
          </tbody>
        </table>
      </CompareAnimations>,
    );
    expect(screen.getByText('cell')).toBeDefined();
  });

  it('wraps children in a div', () => {
    const { container } = render(
      <CompareAnimations>
        <span>Child</span>
      </CompareAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('animates cells with rotateX on fine-pointer devices', () => {
    render(
      <CompareAnimations>
        <div className="compare__table">
          <div data-animate="cell">a</div>
          <div data-animate="cell">b</div>
        </div>
      </CompareAnimations>,
    );

    const noRmEntry = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: no-preference)',
    );
    expect(noRmEntry).toBeDefined();
    (noRmEntry![1] as () => void)();

    // Find the cells tween (the one that sets rotateX).
    const rotateCall = gsapFrom.mock.calls.find(
      ([, vars]) =>
        (vars as { rotateX?: number } | undefined)?.rotateX === -80,
    );
    expect(rotateCall).toBeDefined();
    const rotateVars = rotateCall![1] as {
      rotateX: number;
      transformOrigin: string;
      ease: string;
    };
    expect(rotateVars.transformOrigin).toBe('center bottom');
    expect(rotateVars.ease).toBe('back.out(1.3)');
  });

  it('falls back to y+opacity on coarse-pointer (touch) devices', () => {
    restoreMatchMedia();
    restoreMatchMedia = installMatchMedia({ '(pointer: coarse)': true });

    render(
      <CompareAnimations>
        <div className="compare__table">
          <div data-animate="cell">a</div>
        </div>
      </CompareAnimations>,
    );

    const noRmEntry = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: no-preference)',
    );
    (noRmEntry![1] as () => void)();

    // The 3D rotateX call must NOT be present on coarse pointer.
    const rotateCall = gsapFrom.mock.calls.find(
      ([, vars]) =>
        (vars as { rotateX?: number } | undefined)?.rotateX === -80,
    );
    expect(rotateCall).toBeUndefined();

    // A y-based fallback with opacity 0 MUST be there.
    const yCall = gsapFrom.mock.calls.find(
      ([, vars]) =>
        (vars as { y?: number; opacity?: number } | undefined)?.y === 20 &&
        (vars as { y?: number; opacity?: number }).opacity === 0,
    );
    expect(yCall).toBeDefined();
  });
});
