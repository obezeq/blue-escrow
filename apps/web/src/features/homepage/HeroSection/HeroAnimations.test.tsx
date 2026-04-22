import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import type * as ReactModule from 'react';
import { PRELOADER_DONE_EVENT } from '@/lib/preloader/completion';

const {
  gsapSet,
  gsapTo,
  gsapFrom,
  mmAdd,
  splitCreateCalls,
  splitReverts,
  customEaseGet,
  customEaseCreate,
} = vi.hoisted(() => ({
  gsapSet: vi.fn(),
  gsapTo: vi.fn(),
  gsapFrom: vi.fn(),
  mmAdd: vi.fn(),
  splitCreateCalls: [] as Array<{ chars: unknown[]; words: unknown[]; revert: () => void }>,
  splitReverts: vi.fn(),
  // Start with no `letterPop` registered so the first mount triggers
  // `CustomEase.create`. After the first mount the value is sticky for the
  // rest of the module lifetime — mirrors the production contract.
  registered: new Set<string>(),
  customEaseGet: vi.fn(),
  customEaseCreate: vi.fn(),
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
  mmAdd.mockClear();
  splitCreateCalls.length = 0;
  splitReverts.mockClear();
  customEaseGet.mockReset();
  customEaseCreate.mockReset();
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

  it('creates a SplitText on the title when preloader:done fires and no-reduced-motion matches', () => {
    render(
      <header className="hero">
        <HeroAnimations>
          <h1 className="hero__title">Hero Title</h1>
        </HeroAnimations>
      </header>,
    );

    // CustomEase not yet registered -> `get()` returns undefined, `create()`
    // should be called exactly once per mount.
    customEaseGet.mockReturnValue(undefined);

    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_DONE_EVENT));
    });

    expect(customEaseCreate).toHaveBeenCalledWith(
      'letterPop',
      'M0,0 C0.2,0 0.3,1 1,1',
    );

    const noRmEntry = mmAdd.mock.calls.find(
      ([query]) => query === '(prefers-reduced-motion: no-preference)',
    );
    act(() => {
      (noRmEntry![1] as () => void)();
    });

    expect(splitCreateCalls.length).toBe(1);
  });

  it('reverts the SplitText on unmount so remounts do not stack char spans', () => {
    customEaseGet.mockReturnValue(undefined);
    const { unmount } = render(
      <header className="hero">
        <HeroAnimations>
          <h1 className="hero__title">Hero Title</h1>
        </HeroAnimations>
      </header>,
    );

    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_DONE_EVENT));
    });

    const noRmEntry = mmAdd.mock.calls.find(
      ([query]) => query === '(prefers-reduced-motion: no-preference)',
    );
    act(() => {
      (noRmEntry![1] as () => void)();
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
});
