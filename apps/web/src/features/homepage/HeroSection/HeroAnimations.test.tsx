import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import type * as ReactModule from 'react';
import {
  PRELOADER_DONE_EVENT,
  PRELOADER_EXIT_START_EVENT,
} from '@/lib/preloader/completion';

const {
  gsapSet,
  gsapTo,
  gsapFrom,
  gsapFromTo,
  timelineFactory,
  tlCalls,
  mmAdd,
  splitCreateCalls,
  splitReverts,
  customEaseGet,
  customEaseCreate,
} = vi.hoisted(() => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const makeTimeline = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tl: any = {};
    const record = (method: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.fn((...args: any[]) => {
        calls.push({ method, args });
        return tl;
      });
    tl.fromTo = record('fromTo');
    tl.from = record('from');
    tl.to = record('to');
    tl.set = record('set');
    return tl;
  };
  return {
    gsapSet: vi.fn(),
    gsapTo: vi.fn(),
    gsapFrom: vi.fn(),
    gsapFromTo: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    timelineFactory: vi.fn((_config?: unknown) => makeTimeline()),
    tlCalls: calls,
    mmAdd: vi.fn(),
    splitCreateCalls: [] as Array<{ chars: unknown[]; words: unknown[]; revert: () => void }>,
    splitReverts: vi.fn(),
    customEaseGet: vi.fn(),
    customEaseCreate: vi.fn(),
  };
});

vi.mock('@/animations/config/gsap-register', async () => {
  const React = await vi.importActual<typeof ReactModule>('react');
  return {
    gsap: {
      matchMedia: () => ({ add: mmAdd }),
      timeline: timelineFactory,
      from: gsapFrom,
      to: gsapTo,
      set: gsapSet,
      fromTo: gsapFromTo,
    },
    SplitText: {
      create: vi.fn(() => {
        const self = {
          chars: [] as unknown[],
          words: [] as unknown[],
          revert: () => splitReverts(),
        };
        splitCreateCalls.push(self);
        return self;
      }),
    },
    CustomEase: {
      get: customEaseGet,
      create: customEaseCreate,
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
  gsapFromTo.mockClear();
  timelineFactory.mockClear();
  tlCalls.length = 0;
  mmAdd.mockClear();
  splitCreateCalls.length = 0;
  splitReverts.mockClear();
  customEaseGet.mockReset();
  customEaseCreate.mockReset();
  // Critical: completion.ts reads this synchronously on subscribe.
  delete document.documentElement.dataset.preloader;
});

// Helper: render a hero-shaped DOM so the no-reduced-motion branch can query
// hero__title, hero__word, and [data-animate] elements.
function renderFullHero() {
  return render(
    <header className="hero">
      <HeroAnimations>
        <h1 className="hero__title">
          <span className="hero__word">Blue</span>
          <span className="hero__word">Escrow</span>
        </h1>
        <p data-animate>Secure escrow deals</p>
        <div data-animate>CTA</div>
      </HeroAnimations>
    </header>,
  );
}

// Helper: grab the no-reduced-motion callback that the component registered
// with gsap.matchMedia().add(...).
function getNoReducedMotionCallback() {
  const entry = mmAdd.mock.calls.find(
    ([query]) => query === '(prefers-reduced-motion: no-preference)',
  );
  expect(entry).toBeDefined();
  return entry![1] as () => void;
}

// Helper: grab the reduced-motion callback.
function getReducedMotionCallback() {
  const entry = mmAdd.mock.calls.find(
    ([query]) => query === '(prefers-reduced-motion: reduce)',
  );
  expect(entry).toBeDefined();
  return entry![1] as () => void;
}

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

  it('does not invoke gsap.matchMedia until preloader:exit-start fires', () => {
    render(
      <HeroAnimations>
        <h1>Hero</h1>
      </HeroAnimations>,
    );
    expect(mmAdd).not.toHaveBeenCalled();
    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_EXIT_START_EVENT));
    });
    expect(mmAdd).toHaveBeenCalled();
  });

  it('starts immediately if preloader is already exiting at mount', () => {
    document.documentElement.dataset.preloader = 'exiting';
    render(
      <HeroAnimations>
        <h1>Hero</h1>
      </HeroAnimations>,
    );
    // Synchronously via the isPreloaderExiting() fallback in
    // onPreloaderExitStart.
    expect(mmAdd).toHaveBeenCalled();
  });

  it('starts immediately if preloader is already done at mount', () => {
    document.documentElement.dataset.preloader = 'done';
    render(
      <HeroAnimations>
        <h1>Hero</h1>
      </HeroAnimations>,
    );
    // Validates mid-flight hydration continues to work — onPreloaderExitStart
    // also honours `done` as an "already past the start" state.
    expect(mmAdd).toHaveBeenCalled();
  });

  it('uses a single timeline with fromTo / from (not set+to-with-delay)', () => {
    renderFullHero();

    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_EXIT_START_EVENT));
    });

    // Drive the no-reduced-motion branch.
    act(() => {
      getNoReducedMotionCallback()();
    });

    // A timeline was instantiated for the intro choreography.
    expect(timelineFactory).toHaveBeenCalled();

    // The timeline received at least one fromTo call (words and/or each
    // [data-animate]) and at least one from call (SplitText chars). The
    // exact number depends on whether production stagger-ifies a single
    // selector or enumerates per element — both shapes are valid.
    const fromToMethods = tlCalls.filter((c) => c.method === 'fromTo');
    const fromMethods = tlCalls.filter((c) => c.method === 'from');
    expect(fromToMethods.length).toBeGreaterThanOrEqual(1);
    expect(fromMethods.length).toBeGreaterThanOrEqual(1);

    // The legacy pattern is gone: top-level gsap.set for intro-hidden state
    // must NOT be called in the no-reduced-motion branch. It may still fire
    // from the reduced-motion branch (clearProps), but that branch was not
    // executed here.
    const forbiddenSet = gsapSet.mock.calls.find(([, vars]) => {
      const v = vars as { yPercent?: number; opacity?: number; y?: number } | undefined;
      return (
        v?.yPercent === 115 || (v?.opacity === 0 && v?.y === 16)
      );
    });
    expect(forbiddenSet).toBeUndefined();

    // Top-level gsap.fromTo should NEVER be called — fromTo belongs on the
    // timeline in this refactor.
    expect(gsapFromTo).not.toHaveBeenCalled();
  });

  it('parallax tween includes SCRUB_DEFAULTS_SAFE (invalidateOnRefresh + fastScrollEnd)', () => {
    renderFullHero();

    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_EXIT_START_EVENT));
    });

    act(() => {
      getNoReducedMotionCallback()();
    });

    // Parallax stays OUTSIDE the timeline — top-level gsap.to with a
    // scrollTrigger config.
    const parallaxCall = gsapTo.mock.calls.find(
      ([, vars]) =>
        (vars as { scrollTrigger?: unknown } | undefined)?.scrollTrigger !==
        undefined,
    );
    expect(parallaxCall).toBeDefined();
    const scrollTriggerCfg = (
      parallaxCall![1] as {
        scrollTrigger: {
          scrub: unknown;
          invalidateOnRefresh: unknown;
          fastScrollEnd: unknown;
        };
      }
    ).scrollTrigger;
    expect(scrollTriggerCfg.scrub).toBe(0.6);
    expect(scrollTriggerCfg.invalidateOnRefresh).toBe(true);
    expect(scrollTriggerCfg.fastScrollEnd).toBe(true);
  });

  it('creates a SplitText on the title when noReducedMotion matches and feeds it to timeline.from', () => {
    renderFullHero();

    // CustomEase not yet registered -> `get()` returns undefined, so
    // `create()` should fire exactly once per mount.
    customEaseGet.mockReturnValue(undefined);

    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_EXIT_START_EVENT));
    });

    expect(customEaseCreate).toHaveBeenCalledWith(
      'letterPop',
      'M0,0 C0.2,0 0.3,1 1,1',
    );

    act(() => {
      getNoReducedMotionCallback()();
    });

    expect(splitCreateCalls.length).toBe(1);

    // The SplitText's chars must feed into timeline.from — not top-level
    // gsap.from.
    const split = splitCreateCalls[0];
    const fromFedTheChars = tlCalls.some(
      (c) => c.method === 'from' && c.args[0] === split.chars,
    );
    expect(fromFedTheChars).toBe(true);
    expect(gsapFrom).not.toHaveBeenCalledWith(split.chars, expect.anything());
  });

  it('reverts the SplitText on unmount so remounts do not stack char spans', () => {
    customEaseGet.mockReturnValue(undefined);
    const { unmount } = renderFullHero();

    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_EXIT_START_EVENT));
    });

    act(() => {
      getNoReducedMotionCallback()();
    });

    expect(splitReverts).not.toHaveBeenCalled();
    unmount();
    expect(splitReverts).toHaveBeenCalledTimes(1);
  });

  it('does not re-create letterPop when CustomEase.get already returns an ease', () => {
    // Second-mount scenario: `CustomEase.get('letterPop')` returns a truthy
    // ease object, so `create()` MUST NOT fire again.
    customEaseGet.mockReturnValue({});
    render(
      <HeroAnimations>
        <h1 className="hero__title">Hero</h1>
      </HeroAnimations>,
    );
    expect(customEaseCreate).not.toHaveBeenCalled();
  });

  it('reduced-motion branch clears the CSS initial hidden state', () => {
    renderFullHero();

    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_EXIT_START_EVENT));
    });

    // Drive the reduced-motion branch only.
    act(() => {
      getReducedMotionCallback()();
    });

    // gsap.set must be called with { clearProps: 'all', ... } somewhere in
    // this branch to strip the CSS-installed initial hidden state.
    const clearAllCalls = gsapSet.mock.calls.filter(([, vars]) => {
      const v = vars as { clearProps?: string } | undefined;
      return v?.clearProps === 'all';
    });
    expect(clearAllCalls.length).toBeGreaterThanOrEqual(1);
  });

  // Sanity: the old DONE event should also not trigger the animation path
  // on its own — the new contract listens exclusively to EXIT_START.
  it('ignores bare preloader:done events (new contract listens to exit-start)', () => {
    render(
      <HeroAnimations>
        <h1>Hero</h1>
      </HeroAnimations>,
    );
    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_DONE_EVENT));
    });
    expect(mmAdd).not.toHaveBeenCalled();
  });
});
