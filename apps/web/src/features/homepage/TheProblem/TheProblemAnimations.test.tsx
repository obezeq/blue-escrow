import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type * as ReactModule from 'react';

// ---------------------------------------------------------------------------
// Hoisted shared mock state — all test-visible spies live here so both the
// mocked modules and the spec bodies can reference the same instances.
// ---------------------------------------------------------------------------
const {
  gsapFrom,
  gsapFromTo,
  gsapSet,
  gsapTo,
  gsapRegisterPlugin,
  gsapDelayedCall,
  driftSetter,
  gsapQuickTo,
  gsapTimeline,
  mmAdd,
  mmRevert,
  splitCreate,
  splitInstances,
  splitReverts,
  scrollTriggerCreate,
  scrollTriggerRefresh,
  scrollTriggerCreateCalls,
  timelineCalls,
  observerCreate,
  observerInstances,
  registerProblemEases,
  scheduleRefreshSpy,
  lastTimelineHolder,
  lastTriggerHolder,
} = vi.hoisted(() => {
  const splitInstances: Array<{
    words: unknown[];
    chars: unknown[];
    revert: ReturnType<typeof vi.fn>;
  }> = [];
  const observerInstances: Array<{ kill: ReturnType<typeof vi.fn> }> = [];
  const splitReverts = vi.fn();
  const driftSetter = vi.fn();
  const scrollTriggerCreateCalls: Array<Record<string, unknown>> = [];
  const timelineCalls: Array<{ method: string; args: unknown[] }> = [];
  // Holders so helper accessors can read the latest-created instance across
  // tests. Using an object wrapper keeps the reference stable through
  // vi.hoisted lifting.
  const lastTimelineHolder: {
    current: ReturnType<typeof buildTimelineType> | null;
  } = { current: null };
  const lastTriggerHolder: {
    current: {
      id?: unknown;
      start: number;
      end: number;
      isActive: boolean;
      progress: number;
      kill: ReturnType<typeof vi.fn>;
    } | null;
  } = { current: null };
  // Helper type alias for the holder (avoids `any`).
  type TimelineRecorder = {
    labels: Record<string, number>;
    duration: ReturnType<typeof vi.fn>;
    progress: ReturnType<typeof vi.fn>;
    kill: ReturnType<typeof vi.fn>;
    addLabel: ReturnType<typeof vi.fn>;
    to: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function buildTimelineType(): TimelineRecorder {
    return {} as TimelineRecorder;
  }

  return {
    gsapFrom: vi.fn(),
    gsapFromTo: vi.fn(),
    gsapSet: vi.fn(),
    gsapTo: vi.fn(),
    gsapRegisterPlugin: vi.fn(),
    gsapDelayedCall: vi.fn(
      (_delay: number, _cb: () => void) =>
        ({ kill: vi.fn() }) as { kill: () => void },
    ),
    driftSetter,
    gsapQuickTo: vi.fn(() => driftSetter),
    gsapTimeline: vi.fn(),
    mmAdd: vi.fn(),
    mmRevert: vi.fn(),
    splitCreate: vi.fn(),
    splitInstances,
    splitReverts,
    scrollTriggerCreate: vi.fn(),
    scrollTriggerRefresh: vi.fn(),
    scrollTriggerCreateCalls,
    timelineCalls,
    observerCreate: vi.fn(),
    observerInstances,
    registerProblemEases: vi.fn(),
    scheduleRefreshSpy: vi.fn(),
    lastTimelineHolder,
    lastTriggerHolder,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/animations/config/gsap-register', async () => {
  const React = await vi.importActual<typeof ReactModule>('react');

  splitCreate.mockImplementation(
    (_target: unknown, _config: { type: string }) => {
      const instance = {
        words: [] as unknown[],
        chars: [] as unknown[],
        revert: (() => {
          splitReverts();
        }) as unknown as ReturnType<typeof vi.fn>,
      };
      splitInstances.push(
        instance as unknown as (typeof splitInstances)[number],
      );
      return instance;
    },
  );

  // Factory cloned from HowItWorksAnimations.test.tsx:51–86.
  // Each call to gsap.timeline() creates a fresh recording proxy pushed into
  // lastTimelineHolder so specs can inspect the most-recent timeline.
  const buildTimeline = () => {
    const labels: Record<string, number> = {};
    let labelCursor = 0;
    const tl = {
      labels,
      duration: vi.fn(() => 10),
      progress: vi.fn(() => 0),
      kill: vi.fn(),
      addLabel: vi.fn((name: string, position?: number | string) => {
        if (typeof position === 'number') {
          labels[name] = position;
        } else {
          labels[name] = labelCursor;
          labelCursor += 1;
        }
        timelineCalls.push({ method: 'addLabel', args: [name, position] });
        return tl;
      }),
      to: vi.fn((...args: unknown[]) => {
        timelineCalls.push({ method: 'to', args });
        return tl;
      }),
      from: vi.fn((...args: unknown[]) => {
        timelineCalls.push({ method: 'from', args });
        return tl;
      }),
      set: vi.fn((...args: unknown[]) => {
        timelineCalls.push({ method: 'set', args });
        return tl;
      }),
    };
    return tl;
  };

  gsapTimeline.mockImplementation(() => {
    const tl = buildTimeline();
    lastTimelineHolder.current = tl;
    return tl;
  });

  scrollTriggerCreate.mockImplementation((cfg: Record<string, unknown>) => {
    scrollTriggerCreateCalls.push(cfg);
    const trig = {
      id: cfg.id,
      start: 100,
      end: 2000,
      isActive: false,
      progress: 0,
      kill: vi.fn(),
    };
    lastTriggerHolder.current = trig;
    return trig;
  });

  return {
    gsap: {
      matchMedia: () => ({ add: mmAdd, revert: mmRevert }),
      from: gsapFrom,
      fromTo: gsapFromTo,
      set: gsapSet,
      to: gsapTo,
      timeline: gsapTimeline,
      quickTo: gsapQuickTo,
      delayedCall: gsapDelayedCall,
      registerPlugin: gsapRegisterPlugin,
      utils: {
        clamp: (min: number, max: number, v: number) =>
          Math.max(min, Math.min(max, v)),
      },
    },
    SplitText: {
      create: splitCreate,
    },
    ScrollTrigger: {
      create: scrollTriggerCreate,
      refresh: scrollTriggerRefresh,
    },
    CustomEase: {
      create: vi.fn(),
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

vi.mock('@/animations/config/motion-system', () => ({
  SCRUB_DEFAULTS_SAFE: {
    invalidateOnRefresh: true,
    fastScrollEnd: true,
    anticipatePin: 1,
  },
  scheduleRefresh: scheduleRefreshSpy,
}));

vi.mock('gsap/Observer', () => {
  observerCreate.mockImplementation((_config: Record<string, unknown>) => {
    const instance = { kill: vi.fn() };
    observerInstances.push(instance);
    return instance;
  });
  return {
    Observer: {
      create: observerCreate,
    },
  };
});

vi.mock('./problem-eases', () => ({
  registerProblemEases,
  PROBLEM_EASE_NAMES: {
    fall: 'problem-fall',
    strike: 'problem-strike',
    settle: 'problem-settle',
    monoTick: 'problem-mono-tick',
  },
}));

// Import AFTER mocks are declared so the component resolves the mocked deps.
import { TheProblemAnimations } from './TheProblemAnimations';

afterEach(() => {
  cleanup();
  gsapFrom.mockClear();
  gsapFromTo.mockClear();
  gsapSet.mockClear();
  gsapTo.mockClear();
  gsapRegisterPlugin.mockClear();
  gsapDelayedCall.mockClear();
  gsapQuickTo.mockClear();
  gsapTimeline.mockClear();
  driftSetter.mockClear();
  mmAdd.mockClear();
  mmRevert.mockClear();
  splitCreate.mockClear();
  splitInstances.length = 0;
  splitReverts.mockClear();
  scrollTriggerCreate.mockClear();
  scrollTriggerRefresh.mockClear();
  scrollTriggerCreateCalls.length = 0;
  timelineCalls.length = 0;
  observerCreate.mockClear();
  observerInstances.length = 0;
  registerProblemEases.mockClear();
  scheduleRefreshSpy.mockClear();
  lastTimelineHolder.current = null;
  lastTriggerHolder.current = null;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type MmCallback = () => void;

function invokeNoReducedMotion(): void {
  const entry = mmAdd.mock.calls.find(
    ([query]) => query === '(prefers-reduced-motion: no-preference)',
  );
  expect(entry).toBeDefined();
  (entry![1] as MmCallback)();
}

function invokeReducedMotion(): void {
  const entry = mmAdd.mock.calls.find(
    ([query]) => query === '(prefers-reduced-motion: reduce)',
  );
  expect(entry).toBeDefined();
  (entry![1] as MmCallback)();
}

function invokeLine3Pin(): void {
  const entry = mmAdd.mock.calls.find(
    ([q]) =>
      typeof q === 'string' &&
      q.includes('min-width: 900px') &&
      q.includes('min-height: 700px'),
  );
  expect(entry, 'MEDIA_LINE3_PIN branch must be registered').toBeDefined();
  (entry![1] as MmCallback)();
}

function invokeLine3Mobile(): void {
  const entry = mmAdd.mock.calls.find(
    ([q]) => typeof q === 'string' && q.includes('max-width: 899px'),
  );
  expect(entry, 'MEDIA_LINE3_MOBILE branch must be registered').toBeDefined();
  (entry![1] as MmCallback)();
}

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------
describe('TheProblemAnimations', () => {
  it('renders children', () => {
    render(
      <TheProblemAnimations>
        <p>Test paragraph</p>
      </TheProblemAnimations>,
    );
    expect(screen.getByText('Test paragraph')).toBeDefined();
  });

  it('registers problem eases on mount', () => {
    render(
      <TheProblemAnimations>
        <p>body</p>
      </TheProblemAnimations>,
    );
    expect(registerProblemEases).toHaveBeenCalledTimes(1);
  });

  it('registers Observer plugin', () => {
    render(
      <TheProblemAnimations>
        <p>body</p>
      </TheProblemAnimations>,
    );
    expect(gsapRegisterPlugin).toHaveBeenCalled();
    // First arg should be the Observer object reference.
    expect(gsapRegisterPlugin.mock.calls[0]?.[0]).toBeDefined();
  });

  it('creates one SplitText for eyebrow (chars)', () => {
    render(
      <TheProblemAnimations>
        <p data-animate="eyebrow">The problem</p>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();

    const eyebrowCalls = splitCreate.mock.calls.filter(
      ([, config]) =>
        (config as { type?: string } | undefined)?.type === 'chars',
    );
    expect(eyebrowCalls.length).toBe(1);
  });

  it('creates one SplitText per line (words) in common branch — SKIPS line 3', () => {
    // Line 3 lives inside [data-stage="line-3"] and is authored by the pin
    // branch's master timeline, so the common forEach must skip it.
    render(
      <TheProblemAnimations>
        <p data-animate="line">line one</p>
        <p data-animate="line">line two</p>
        <div data-stage="line-3">
          <p data-animate="line">line three</p>
        </div>
        <p data-animate="line">line four</p>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();

    const wordsCalls = splitCreate.mock.calls.filter(
      ([, config]) =>
        (config as { type?: string } | undefined)?.type === 'words',
    );
    // Lines 1, 2, 4 — line 3 is delegated to the pin/mobile branch.
    expect(wordsCalls.length).toBe(3);
  });

  it('pin branch adds the missing line-3 words SplitText (total 4 after both branches)', () => {
    render(
      <TheProblemAnimations>
        <p data-animate="line">line one</p>
        <p data-animate="line">line two</p>
        <div data-stage="line-3">
          <p data-animate="line">line three</p>
          <s data-animate="stranger">
            <span>a stranger too</span>
          </s>
        </div>
        <p data-animate="line">line four</p>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();
    invokeLine3Pin();

    const wordsCalls = splitCreate.mock.calls.filter(
      ([, config]) =>
        (config as { type?: string } | undefined)?.type === 'words',
    );
    // 3 (common branch: lines 1, 2, 4) + 1 (pin branch: line 3) = 4.
    expect(wordsCalls.length).toBe(4);
  });

  it('creates nested SplitText for stranger (words, chars)', () => {
    // Mobile branch authors the `words, chars` split; it needs both
    // `[data-stage="line-3"] [data-animate="line"]` AND
    // `[data-animate="stranger"]` present or it bails early.
    render(
      <TheProblemAnimations>
        <div data-stage="line-3">
          <p data-animate="line">line three</p>
          <s data-animate="stranger">
            <span>a stranger too</span>
          </s>
        </div>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();
    invokeLine3Mobile();

    const nestedCalls = splitCreate.mock.calls.filter(
      ([, config]) =>
        (config as { type?: string } | undefined)?.type === 'words, chars',
    );
    expect(nestedCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('fires the strikethrough scrub tween inside the pin branch master timeline', () => {
    // The pin branch now runs strike as:
    //   masterTl.to(path, { strokeDashoffset: 0, duration: 0.8, ease: '…' },
    //              'stage-strike')
    // — NOT as an independent `gsap.fromTo(path, { scrollTrigger: scrub 0.6 })`.
    render(
      <TheProblemAnimations>
        <div data-stage="line-3">
          <p data-animate="line">line three</p>
          <s data-animate="stranger">
            <span>a stranger too</span>
            <svg>
              <path />
            </svg>
          </s>
        </div>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();
    invokeLine3Pin();

    // The most-recently created timeline is the problem-stage master.
    const masterTl = lastTimelineHolder.current;
    expect(masterTl, 'master timeline should be created by pin branch').not
      .toBeNull();

    // Assert a `.to()` call matched { strokeDashoffset: 0 } at label
    // 'stage-strike'. Timeline recorder logs each method + args pair.
    const strikeTo = timelineCalls.find((c) => {
      if (c.method !== 'to') return false;
      const [, vars, pos] = c.args as [
        unknown,
        { strokeDashoffset?: unknown } | undefined,
        unknown,
      ];
      return vars?.strokeDashoffset === 0 && pos === 'stage-strike';
    });
    expect(strikeTo, 'strike tween must land at the stage-strike label').toBeDefined();

    // Assert the ScrollTrigger pin config matches the documented contract.
    const pinCfg = scrollTriggerCreateCalls.find(
      (cfg) => cfg.id === 'problem-stage',
    );
    expect(pinCfg, 'problem-stage ScrollTrigger must be created').toBeDefined();
    expect(pinCfg!.pin).toBe(true);
    expect(pinCfg!.pinType).toBe('transform');
    expect(pinCfg!.pinSpacing).toBe(true);
    expect(pinCfg!.scrub).toBe(0.6);
    // SCRUB_DEFAULTS_SAFE spread.
    expect(pinCfg!.invalidateOnRefresh).toBe(true);
    expect(pinCfg!.fastScrollEnd).toBe(true);
    expect(pinCfg!.anticipatePin).toBe(1);
    // The pin drives the timeline via `animation`.
    expect(pinCfg!.animation).toBeTruthy();
  });

  it('master timeline has labels stage-curtain → stage-fall → stage-strike → stage-settle in order', () => {
    render(
      <TheProblemAnimations>
        <div data-stage="line-3">
          <p data-animate="line">line three</p>
          <s data-animate="stranger">
            <span>a stranger too</span>
            <svg>
              <path />
            </svg>
          </s>
        </div>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();
    invokeLine3Pin();

    const labelOrder = timelineCalls
      .filter((c) => c.method === 'addLabel')
      .map((c) => c.args[0] as string);
    expect(labelOrder).toEqual([
      'stage-curtain',
      'stage-fall',
      'stage-strike',
      'stage-settle',
    ]);
  });

  it('pin branch is NOT invoked under reduced-motion', () => {
    render(
      <TheProblemAnimations>
        <div data-stage="line-3">
          <p data-animate="line">line three</p>
          <s data-animate="stranger">
            <span>a stranger too</span>
            <svg>
              <path />
            </svg>
          </s>
        </div>
      </TheProblemAnimations>,
    );
    invokeReducedMotion();

    const pinCfg = scrollTriggerCreateCalls.find(
      (cfg) => cfg.id === 'problem-stage',
    );
    expect(pinCfg).toBeUndefined();
  });

  it('legacy independent scrub ScrollTrigger is NOT created in pin branch', () => {
    // In the new pin architecture, strikethrough lives INSIDE the master
    // timeline (driven by the pin's `animation`). It must NOT be authored as
    // a standalone `gsap.fromTo(..., { scrollTrigger: { scrub: 0.6 } })`.
    render(
      <TheProblemAnimations>
        <div data-stage="line-3">
          <p data-animate="line">line three</p>
          <s data-animate="stranger">
            <span>a stranger too</span>
            <svg>
              <path />
            </svg>
          </s>
        </div>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();
    invokeLine3Pin();

    const legacyStrike = gsapFromTo.mock.calls.find(([, , toVars]) => {
      const vars = toVars as
        | {
            strokeDashoffset?: unknown;
            scrollTrigger?: { scrub?: unknown };
          }
        | undefined;
      return (
        vars?.strokeDashoffset === 0 && vars?.scrollTrigger?.scrub === 0.6
      );
    });
    expect(legacyStrike).toBeUndefined();
  });

  it('mobile branch creates independent triggers for line 3 (legacy scrub pattern preserved)', () => {
    render(
      <TheProblemAnimations>
        <div data-stage="line-3">
          <p data-animate="line">line three</p>
          <s data-animate="stranger">
            <span>a stranger too</span>
            <svg>
              <path />
            </svg>
          </s>
        </div>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();
    invokeLine3Mobile();

    const mobileStrike = gsapFromTo.mock.calls.find(([, , toVars]) => {
      const vars = toVars as
        | {
            strokeDashoffset?: unknown;
            scrollTrigger?: { scrub?: unknown };
          }
        | undefined;
      return (
        vars?.strokeDashoffset === 0 && vars?.scrollTrigger?.scrub === 0.6
      );
    });
    expect(
      mobileStrike,
      'mobile branch preserves legacy independent scrub ScrollTrigger',
    ).toBeDefined();

    // Mobile must NOT pin.
    const pinCfg = scrollTriggerCreateCalls.find(
      (cfg) => cfg.id === 'problem-stage',
    );
    expect(pinCfg).toBeUndefined();
  });

  it('creates an Observer for velocity drift', () => {
    render(
      <TheProblemAnimations>
        <s data-animate="stranger">
          <span>a stranger too</span>
        </s>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();

    expect(observerCreate).toHaveBeenCalledTimes(1);
    const [config] = observerCreate.mock.calls[0] ?? [];
    expect((config as { preventDefault?: unknown }).preventDefault).toBe(false);
  });

  it('reverts every SplitText on unmount', () => {
    const { unmount } = render(
      <TheProblemAnimations>
        <p data-animate="eyebrow">eyebrow</p>
        <p data-animate="line">one</p>
        <p data-animate="line">two</p>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();

    const createdCount = splitInstances.length;
    expect(createdCount).toBeGreaterThan(0);
    expect(splitReverts).not.toHaveBeenCalled();

    unmount();

    expect(splitReverts).toHaveBeenCalledTimes(createdCount);
  });

  it('kills the Observer on unmount', () => {
    const { unmount } = render(
      <TheProblemAnimations>
        <s data-animate="stranger">
          <span>a stranger too</span>
        </s>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();

    expect(observerInstances.length).toBe(1);
    const killSpy = observerInstances[0]!.kill;
    expect(killSpy).not.toHaveBeenCalled();

    unmount();

    expect(killSpy).toHaveBeenCalledTimes(1);
  });

  it('cleanup kills the master timeline and pin ScrollTrigger on unmount', () => {
    const { unmount } = render(
      <TheProblemAnimations>
        <div data-stage="line-3">
          <p data-animate="line">line three</p>
          <s data-animate="stranger">
            <span>a stranger too</span>
            <svg>
              <path />
            </svg>
          </s>
        </div>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();
    invokeLine3Pin();

    const capturedTl = lastTimelineHolder.current;
    const capturedTrig = lastTriggerHolder.current;
    expect(capturedTl, 'master timeline must exist before unmount').not.toBeNull();
    expect(capturedTrig, 'pin ScrollTrigger must exist before unmount').not.toBeNull();
    expect(capturedTl!.kill).not.toHaveBeenCalled();
    expect(capturedTrig!.kill).not.toHaveBeenCalled();

    unmount();

    expect(capturedTl!.kill).toHaveBeenCalled();
    expect(capturedTrig!.kill).toHaveBeenCalled();
  });

  it('calls mm.revert() on unmount (belt-and-suspenders cleanup)', () => {
    const { unmount } = render(
      <TheProblemAnimations>
        <p data-animate="eyebrow">eyebrow</p>
      </TheProblemAnimations>,
    );
    expect(mmRevert).not.toHaveBeenCalled();
    unmount();
    expect(mmRevert).toHaveBeenCalled();
  });

  it('clears props in reduced-motion branch', () => {
    render(
      <TheProblemAnimations>
        <p data-animate="eyebrow">eyebrow</p>
        <p data-animate="line">line body</p>
      </TheProblemAnimations>,
    );
    invokeReducedMotion();

    const clearCall = gsapSet.mock.calls.find(([, vars]) => {
      const v = vars as { clearProps?: unknown } | undefined;
      return v?.clearProps === 'all';
    });
    expect(clearCall).toBeDefined();
  });

  it('forces the SVG path stroke-dashoffset to 0 in reduced-motion', () => {
    render(
      <TheProblemAnimations>
        <s data-animate="stranger">
          <span>a stranger too</span>
          <svg>
            <path />
          </svg>
        </s>
      </TheProblemAnimations>,
    );
    invokeReducedMotion();

    const strikeSetCall = gsapSet.mock.calls.find(([, vars]) => {
      const v = vars as { strokeDashoffset?: unknown } | undefined;
      return v?.strokeDashoffset === 0;
    });
    expect(strikeSetCall).toBeDefined();
  });
});
