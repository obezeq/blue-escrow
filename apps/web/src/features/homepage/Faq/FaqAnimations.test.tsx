import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// Hoisted mocks so they are defined before the module factories run.
const { scheduleRefreshMock, gsapSet, gsapFrom, mmAdd } = vi.hoisted(() => ({
  scheduleRefreshMock: vi.fn(),
  gsapSet: vi.fn(),
  gsapFrom: vi.fn(),
  mmAdd: vi.fn(),
}));

vi.mock('@/animations/config/gsap-register', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    gsap: {
      matchMedia: () => ({ add: mmAdd }),
      from: gsapFrom,
      set: gsapSet,
    },
    useGSAP: (cb: () => void | (() => void)) => {
      React.useEffect(
        () => {
          const cleanupFn = cb();
          return typeof cleanupFn === 'function' ? cleanupFn : undefined;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
      );
    },
  };
});

vi.mock('@/animations/config/motion-system', () => ({
  scheduleRefresh: scheduleRefreshMock,
}));

import { FaqAnimations } from './FaqAnimations';

function installMatchMedia(matches: boolean) {
  const impl = (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(impl),
  });
}

afterEach(() => {
  cleanup();
  scheduleRefreshMock.mockClear();
  gsapSet.mockClear();
  gsapFrom.mockClear();
  mmAdd.mockClear();
});

describe('FaqAnimations — ScrollTrigger refresh gating', () => {
  beforeEach(() => {
    installMatchMedia(true); // no-preference branch
  });

  it('does not call scheduleRefresh on initial mount', () => {
    render(
      <FaqAnimations refreshKey={0}>
        <div data-animate="item" />
      </FaqAnimations>,
    );
    expect(scheduleRefreshMock).not.toHaveBeenCalled();
  });

  it('calls scheduleRefresh(200) on every refreshKey flip', () => {
    const { rerender } = render(
      <FaqAnimations refreshKey={0}>
        <div data-animate="item" />
      </FaqAnimations>,
    );
    expect(scheduleRefreshMock).not.toHaveBeenCalled();

    // Simulate 5 rapid toggles (refreshKey flips). scheduleRefresh is
    // itself the debouncer — each toggle hands it a new arming request,
    // and motion-system.ts collapses them to ONE ScrollTrigger.refresh().
    for (let i = 1; i <= 5; i += 1) {
      rerender(
        <FaqAnimations refreshKey={i}>
          <div data-animate="item" />
        </FaqAnimations>,
      );
    }

    expect(scheduleRefreshMock).toHaveBeenCalledTimes(5);
    scheduleRefreshMock.mock.calls.forEach(([delay]) => {
      expect(delay).toBe(200);
    });
  });

  it('does NOT schedule refresh when prefers-reduced-motion is set', () => {
    installMatchMedia(false); // reduced-motion branch
    const { rerender } = render(
      <FaqAnimations refreshKey={0}>
        <div data-animate="item" />
      </FaqAnimations>,
    );

    for (let i = 1; i <= 3; i += 1) {
      rerender(
        <FaqAnimations refreshKey={i}>
          <div data-animate="item" />
        </FaqAnimations>,
      );
    }

    expect(scheduleRefreshMock).not.toHaveBeenCalled();
  });

  it('renders children inside a div scope', () => {
    const { container } = render(
      <FaqAnimations refreshKey={0}>
        <span data-testid="child">hi</span>
      </FaqAnimations>,
    );
    expect(container.firstElementChild?.tagName).toBe('DIV');
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
  });
});
