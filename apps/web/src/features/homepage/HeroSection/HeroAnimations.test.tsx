import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import type * as ReactModule from 'react';
import { PRELOADER_DONE_EVENT } from '@/lib/preloader/completion';

const { gsapSet, gsapTo, gsapFrom, mmAdd } = vi.hoisted(() => ({
  gsapSet: vi.fn(),
  gsapTo: vi.fn(),
  gsapFrom: vi.fn(),
  mmAdd: vi.fn(),
}));

vi.mock('@/animations/config/gsap-register', async () => {
  const React = await vi.importActual<typeof ReactModule>('react');
  return {
    gsap: {
      matchMedia: () => ({ add: mmAdd }),
      from: gsapFrom,
      to: gsapTo,
      set: gsapSet,
    },
    // Run the callback inside a real useEffect so refs are populated.
    useGSAP: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});

import { HeroAnimations } from './HeroAnimations';

afterEach(() => {
  cleanup();
  gsapSet.mockClear();
  gsapTo.mockClear();
  gsapFrom.mockClear();
  mmAdd.mockClear();
  delete document.documentElement.dataset.preloader;
});

describe('HeroAnimations', () => {
  it('renders children', () => {
    render(
      <HeroAnimations>
        <h1>Test Heading</h1>
      </HeroAnimations>,
    );
    expect(screen.getByText('Test Heading')).toBeDefined();
  });

  it('wraps children in a div', () => {
    const { container } = render(
      <HeroAnimations>
        <span>Child</span>
      </HeroAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('does not invoke gsap.matchMedia until preloader:done fires', () => {
    render(
      <HeroAnimations>
        <h1>Hero</h1>
      </HeroAnimations>,
    );
    expect(mmAdd).not.toHaveBeenCalled();
    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_DONE_EVENT));
    });
    expect(mmAdd).toHaveBeenCalled();
  });

  it('starts immediately if preloader is already done at mount (data attribute)', () => {
    document.documentElement.dataset.preloader = 'done';
    render(
      <HeroAnimations>
        <h1>Hero</h1>
      </HeroAnimations>,
    );
    expect(mmAdd).toHaveBeenCalled();
  });

  it('parallax tween includes SCRUB_DEFAULTS_SAFE (invalidateOnRefresh + fastScrollEnd)', () => {
    // Render a full hero-like DOM so the parallax branch can find
    // `[class*="hero__title"]` and a closest<header>. The no-reduced-motion
    // branch is invoked by running the captured matchMedia callback.
    render(
      <header className="hero">
        <HeroAnimations>
          <h1 className="hero__title">Hero</h1>
        </HeroAnimations>
      </header>,
    );

    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_DONE_EVENT));
    });

    // mmAdd receives (query, callback). Invoke the no-reduced-motion
    // callback to drive the parallax gsap.to call.
    const noRmEntry = mmAdd.mock.calls.find(
      ([query]) => query === '(prefers-reduced-motion: no-preference)',
    );
    expect(noRmEntry).toBeDefined();
    const noRmCallback = noRmEntry![1] as () => void;
    act(() => {
      noRmCallback();
    });

    // Find the parallax tween (the one that attached a scrollTrigger).
    const parallaxCall = gsapTo.mock.calls.find(
      ([, vars]) =>
        (vars as { scrollTrigger?: unknown } | undefined)?.scrollTrigger !==
        undefined,
    );
    expect(parallaxCall).toBeDefined();
    const scrollTriggerCfg = (
      parallaxCall![1] as {
        scrollTrigger: { scrub: unknown; invalidateOnRefresh: unknown; fastScrollEnd: unknown };
      }
    ).scrollTrigger;
    expect(scrollTriggerCfg.scrub).toBe(0.6);
    expect(scrollTriggerCfg.invalidateOnRefresh).toBe(true);
    expect(scrollTriggerCfg.fastScrollEnd).toBe(true);
  });

});
