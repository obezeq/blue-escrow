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
  mmAdd,
  splitCreate,
  splitInstances,
  splitReverts,
  scrollTriggerRefresh,
  observerCreate,
  observerInstances,
  registerProblemEases,
} = vi.hoisted(() => {
  const splitInstances: Array<{
    words: unknown[];
    chars: unknown[];
    revert: ReturnType<typeof vi.fn>;
  }> = [];
  const observerInstances: Array<{ kill: ReturnType<typeof vi.fn> }> = [];
  const splitReverts = vi.fn();
  const driftSetter = vi.fn();

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
    mmAdd: vi.fn(),
    splitCreate: vi.fn(),
    splitInstances,
    splitReverts,
    scrollTriggerRefresh: vi.fn(),
    observerCreate: vi.fn(),
    observerInstances,
    registerProblemEases: vi.fn(),
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

  return {
    gsap: {
      matchMedia: () => ({ add: mmAdd }),
      from: gsapFrom,
      fromTo: gsapFromTo,
      set: gsapSet,
      to: gsapTo,
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
  driftSetter.mockClear();
  mmAdd.mockClear();
  splitCreate.mockClear();
  splitInstances.length = 0;
  splitReverts.mockClear();
  scrollTriggerRefresh.mockClear();
  observerCreate.mockClear();
  observerInstances.length = 0;
  registerProblemEases.mockClear();
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

  it('creates one SplitText per line (words)', () => {
    render(
      <TheProblemAnimations>
        <p data-animate="line">line one</p>
        <p data-animate="line">line two</p>
        <p data-animate="line">line three</p>
        <p data-animate="line">line four</p>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();

    const wordsCalls = splitCreate.mock.calls.filter(
      ([, config]) =>
        (config as { type?: string } | undefined)?.type === 'words',
    );
    expect(wordsCalls.length).toBe(4);
  });

  it('creates nested SplitText for stranger (words, chars)', () => {
    render(
      <TheProblemAnimations>
        <s data-animate="stranger">
          <span>a stranger too</span>
        </s>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();

    const nestedCalls = splitCreate.mock.calls.filter(
      ([, config]) =>
        (config as { type?: string } | undefined)?.type === 'words, chars',
    );
    expect(nestedCalls.length).toBe(1);
  });

  it('fires the strikethrough scrub tween', () => {
    render(
      <TheProblemAnimations>
        <s data-animate="stranger">
          <span>a stranger too</span>
        </s>
      </TheProblemAnimations>,
    );
    invokeNoReducedMotion();

    const strikeCall = gsapFromTo.mock.calls.find(([, , toVars]) => {
      const vars = toVars as
        | {
            '--strike-scale'?: unknown;
            scrollTrigger?: { scrub?: unknown };
          }
        | undefined;
      return (
        vars?.['--strike-scale'] === 1 && vars?.scrollTrigger?.scrub === 0.6
      );
    });
    expect(strikeCall).toBeDefined();
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

  it('forces --strike-scale: 1 in reduced-motion', () => {
    render(
      <TheProblemAnimations>
        <s data-animate="stranger">
          <span>a stranger too</span>
        </s>
      </TheProblemAnimations>,
    );
    invokeReducedMotion();

    const strikeSetCall = gsapSet.mock.calls.find(([, vars]) => {
      const v = vars as { '--strike-scale'?: unknown } | undefined;
      return v?.['--strike-scale'] === 1;
    });
    expect(strikeSetCall).toBeDefined();
  });
});
