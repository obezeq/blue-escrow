// ---------------------------------------------------------------------------
// HowItWorksAnimations.test.tsx — v7 master-timeline + matchMedia contract.
//
// This file asserts on the SHAPE of the GSAP calls made by the animations
// hook, not on actual visual output (that's e2e territory). We deeply mock
// `@/animations/config/gsap-register` and capture every call to
// `gsap.matchMedia().add(query, fn)`, then invoke each `fn` manually to drive
// each branch through assertions.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { RefObject } from 'react';

import { MATCH_MEDIA } from '@/animations/config/defaults';
import { PHASE_COUNT } from './steps';

// ---------------------------------------------------------------------------
// Mock capture buckets — reset between tests in beforeEach
// ---------------------------------------------------------------------------

type MmEntry = { query: string; fn: () => undefined | (() => void) };
type TimelineCall = {
  method: string;
  args: unknown[];
};

let mmEntries: MmEntry[] = [];
let scrollTriggerCreateCalls: Array<Record<string, unknown>> = [];
let lastCreatedTrigger: {
  start: number;
  end: number;
  kill: ReturnType<typeof vi.fn>;
} | null = null;
let timelineCalls: TimelineCall[] = [];
let lastTimelineInstance: {
  labels: Record<string, number>;
  duration: ReturnType<typeof vi.fn>;
  progress: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  addLabel: ReturnType<typeof vi.fn>;
  to: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
} | null = null;
let quickSetterCalls: Array<[unknown, string]> = [];
let gsapSetCalls: Array<[unknown, Record<string, unknown>]> = [];
let gsapFromCalls: Array<[unknown, Record<string, unknown>]> = [];
let useGSAPLastOpts: unknown = null;
let lenisScrollToSpy = vi.fn();

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/animations/config/gsap-register', () => {
  const buildTimeline = () => {
    const labels: Record<string, number> = {};
    let labelCursor = 0;
    const tl = {
      labels,
      duration: vi.fn(() => 10),
      progress: vi.fn(() => 0),
      kill: vi.fn(),
      addLabel: vi.fn((name: string, position?: number | string) => {
        // Monotonic label positioning — exact offsets don't matter, only
        // that labels EXIST and order is preserved.
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
      set: vi.fn((...args: unknown[]) => {
        timelineCalls.push({ method: 'set', args });
        return tl;
      }),
    };
    lastTimelineInstance = tl;
    return tl;
  };

  const gsap = {
    matchMedia: vi.fn(() => ({
      add: vi.fn((query: string, fn: () => undefined | (() => void)) => {
        mmEntries.push({ query, fn });
      }),
    })),
    timeline: vi.fn(() => buildTimeline()),
    to: vi.fn(() => ({ kill: vi.fn() })),
    from: vi.fn((target: unknown, vars: Record<string, unknown>) => {
      gsapFromCalls.push([target, vars]);
      return { kill: vi.fn() };
    }),
    set: vi.fn((target: unknown, vars: Record<string, unknown>) => {
      gsapSetCalls.push([target, vars]);
    }),
    quickSetter: vi.fn((target: unknown, prop: string) => {
      quickSetterCalls.push([target, prop]);
      return vi.fn();
    }),
    utils: {
      toArray: vi.fn(<T,>(x: T | T[]) => (Array.isArray(x) ? x : [x])),
    },
    ticker: { add: vi.fn(), remove: vi.fn() },
    defaults: vi.fn(),
    registerPlugin: vi.fn(),
  };
  const ScrollTrigger = {
    getById: vi.fn(() => ({ start: 0, end: 1000 })),
    create: vi.fn((cfg: Record<string, unknown>) => {
      scrollTriggerCreateCalls.push(cfg);
      const trig = {
        start: 100,
        end: 2000,
        progress: 0,
        kill: vi.fn(),
      };
      lastCreatedTrigger = trig;
      return trig;
    }),
    refresh: vi.fn(),
    update: vi.fn(),
  };
  const ScrollToPlugin = {};
  const MotionPathPlugin = {};
  const SplitText = {
    create: vi.fn(() => ({ chars: [], revert: vi.fn() })),
  };
  const CustomEase = { create: vi.fn() };
  const useGSAP = vi.fn(
    (fn: (ctx: { kill: () => void }) => void, opts: unknown) => {
      useGSAPLastOpts = opts;
      // Defer invocation — tests drive it via the stored lastFn below.
      (useGSAP as unknown as { lastFn?: typeof fn }).lastFn = fn;
    },
  );
  return {
    gsap,
    ScrollTrigger,
    ScrollToPlugin,
    MotionPathPlugin,
    SplitText,
    CustomEase,
    useGSAP,
  };
});

vi.mock('@/providers/LenisProvider', () => ({
  useLenisInstance: () => ({ scrollTo: lenisScrollToSpy }),
}));

vi.mock('./hiw-eases', async (importOriginal) => {
  const mod = (await importOriginal()) as typeof import('./hiw-eases');
  return {
    ...mod,
    registerHiwEases: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Import under test AFTER mocks
// ---------------------------------------------------------------------------

import { HowItWorksAnimations } from './HowItWorksAnimations';
import * as gsapReg from '@/animations/config/gsap-register';

// ---------------------------------------------------------------------------
// Test fixtures — built via createElement (no innerHTML) to avoid triggering
// the security hook. The stage (passed via stageRef) is a detached div; the
// container ref children are passed as JSX.
// ---------------------------------------------------------------------------

function svgEl(tag: string, attrs: Record<string, string> = {}): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

function buildStage(): HTMLDivElement {
  const stage = document.createElement('div');
  const svg = svgEl('svg', { viewBox: '0 0 1200 720' });
  const dataHiwTags = [
    'actor-client',
    'actor-mid',
    'actor-seller',
    'wire-base-C',
    'wire-base-M',
    'wire-base-S',
    'wire-active-C',
    'wire-active-M',
    'wire-active-S',
    'packet',
    'core-halo',
    'orbits',
  ];
  for (const tag of dataHiwTags) {
    const isWire = tag.startsWith('wire-');
    const node = svgEl(isWire ? 'path' : 'g', { 'data-hiw': tag });
    if (isWire) {
      node.setAttribute('d', 'M0 0 L10 10');
      // Polyfill getTotalLength (jsdom SVGPathElement lacks it).
      (node as unknown as { getTotalLength: () => number }).getTotalLength =
        () => 100;
    }
    svg.appendChild(node);
  }
  stage.appendChild(svg);

  const ledger = document.createElement('span');
  ledger.setAttribute('data-hiw-ledger', 'amount');
  ledger.textContent = '0';
  stage.appendChild(ledger);
  return stage;
}

function FixtureChildren() {
  // Minimum DOM the animations hook expects inside its containerRef.
  // Rendered as real React children so containerRef.current.querySelector
  // finds them.
  return (
    <>
      <div data-animate="eyebrow"></div>
      <h2 data-animate="heading"></h2>
      <p data-animate="subtitle"></p>
      <button data-hiw-rail="0" type="button"></button>
      <button data-hiw-rail="1" type="button"></button>
      <button data-hiw-rail="2" type="button"></button>
      <button data-hiw-rail="3" type="button"></button>
      <button data-hiw-rail="4" type="button"></button>
      <h3 data-animate="narr-title">Title</h3>
      <div data-hiw-narr-host="true"></div>
      <section data-hiw-phase-card="0">
        <div data-animate=""></div>
      </section>
      <section data-hiw-phase-card="1">
        <div data-animate=""></div>
      </section>
      <section data-hiw-phase-card="2">
        <div data-animate=""></div>
      </section>
      <section data-hiw-phase-card="3">
        <div data-animate=""></div>
      </section>
      <section data-hiw-phase-card="4">
        <div data-animate=""></div>
      </section>
    </>
  );
}

function runBranch(query: string) {
  const match = mmEntries.find((e) => e.query === query);
  if (!match) {
    throw new Error(
      `No matchMedia branch registered for query: ${query}. Seen: ${mmEntries
        .map((e) => e.query)
        .join(' | ')}`,
    );
  }
  const cleanup = match.fn();
  return cleanup ?? (() => undefined);
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mmEntries = [];
  scrollTriggerCreateCalls = [];
  lastCreatedTrigger = null;
  timelineCalls = [];
  lastTimelineInstance = null;
  quickSetterCalls = [];
  gsapSetCalls = [];
  gsapFromCalls = [];
  useGSAPLastOpts = null;
  lenisScrollToSpy = vi.fn();
  (gsapReg.ScrollTrigger.refresh as unknown as ReturnType<typeof vi.fn>)
    .mockClear?.();
});
afterEach(() => {
  cleanup();
});

/**
 * Render the component with a stageRef pointing at our test stage DOM, then
 * execute the useGSAP() callback manually so every matchMedia branch is
 * registered.
 */
function renderAnimationsWithFixture(onPhaseChange = vi.fn()) {
  const stage = buildStage();
  const stageRef: RefObject<HTMLDivElement | null> = { current: stage };

  const result = render(
    <HowItWorksAnimations
      stageRef={stageRef}
      onPhaseChange={onPhaseChange}
    >
      <FixtureChildren />
    </HowItWorksAnimations>,
  );

  const fn = (gsapReg.useGSAP as unknown as {
    lastFn?: (ctx: { kill: () => void }) => undefined | (() => void);
  }).lastFn;
  if (fn) fn({ kill: () => {} });

  return { ...result, stage, onPhaseChange, stageRef };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('HowItWorksAnimations — matchMedia branches', () => {
  it('registers the desktop branch with (min-width: 900px) and prefers-reduced-motion: no-preference', () => {
    renderAnimationsWithFixture();
    const entries = mmEntries.map((e) => e.query);
    expect(entries).toContain(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
  });

  it('registers the mobile branch with (max-width: 899px) and prefers-reduced-motion: no-preference', () => {
    renderAnimationsWithFixture();
    const entries = mmEntries.map((e) => e.query);
    expect(entries).toContain(
      '(max-width: 899px) and (prefers-reduced-motion: no-preference)',
    );
  });

  it('registers the reduced-motion branch with MATCH_MEDIA.reducedMotion', () => {
    renderAnimationsWithFixture();
    const entries = mmEntries.map((e) => e.query);
    expect(entries).toContain(MATCH_MEDIA.reducedMotion);
  });

  it('also registers a head-reveal branch under (prefers-reduced-motion: no-preference) for eyebrow/heading/subtitle', () => {
    renderAnimationsWithFixture();
    const entries = mmEntries.map((e) => e.query);
    expect(entries).toContain('(prefers-reduced-motion: no-preference)');
  });
});

describe('HowItWorksAnimations — desktop pinned timeline shape', () => {
  it('creates a master timeline with ScrollTrigger id="hiw-stage"', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    const stageCfg = scrollTriggerCreateCalls.find(
      (cfg) => cfg.id === 'hiw-stage',
    );
    expect(stageCfg).toBeDefined();
  });

  it('sets pin=true, pinType="transform", scrub=0.6, anticipatePin=1, invalidateOnRefresh=true', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    const cfg = scrollTriggerCreateCalls.find((c) => c.id === 'hiw-stage')!;
    expect(cfg.pin).toBe(true);
    expect(cfg.pinType).toBe('transform');
    expect(cfg.scrub).toBe(0.6);
    expect(cfg.anticipatePin).toBe(1);
    expect(cfg.invalidateOnRefresh).toBe(true);
  });

  it('uses an end function that returns a "+=X" string based on window.innerHeight * (PHASE_COUNT-1) * 0.9', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    const cfg = scrollTriggerCreateCalls.find((c) => c.id === 'hiw-stage')!;
    expect(typeof cfg.end).toBe('function');
    const endStr = (cfg.end as () => string)();
    expect(endStr.startsWith('+=')).toBe(true);
    const expected = Math.round(
      window.innerHeight * (PHASE_COUNT - 1) * 0.9,
    );
    expect(endStr).toBe(`+=${expected}`);
  });

  it('snap config uses snapTo as a numeric labelProgresses array (not "labels" string and not a uniform step)', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    const cfg = scrollTriggerCreateCalls.find((c) => c.id === 'hiw-stage')!;
    const snap = cfg.snap as {
      snapTo: unknown;
      duration: unknown;
      ease: unknown;
    };
    expect(Array.isArray(snap.snapTo)).toBe(true);
    expect(typeof snap.snapTo).not.toBe('string');
    expect((snap.snapTo as number[]).length).toBe(PHASE_COUNT);
    (snap.snapTo as number[]).forEach((v) => expect(typeof v).toBe('number'));
  });

  it('adds labels phase-0..phase-4 in order', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    const addLabelCalls = timelineCalls
      .filter((c) => c.method === 'addLabel')
      .map((c) => c.args[0] as string);
    expect(addLabelCalls.slice(0, 5)).toEqual([
      'phase-0',
      'phase-1',
      'phase-2',
      'phase-3',
      'phase-4',
    ]);
  });

  it('dispatches onPhaseChange via nearest-label distance, not floor(progress * N)', () => {
    const onPhaseChange = vi.fn();
    renderAnimationsWithFixture(onPhaseChange);
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    const cfg = scrollTriggerCreateCalls.find((c) => c.id === 'hiw-stage')!;
    // Mock timeline: duration=10, labels at 0,1,2,3,4 → progresses
    // 0.0, 0.1, 0.2, 0.3, 0.4. Progress 0.18 is NEAREST to 0.2 (phase 2)
    // while floor(0.18 * 5) = 0. If the implementation uses floor-binning
    // this test fails.
    const onUpdate = cfg.onUpdate as (self: { progress: number }) => void;
    onUpdate({ progress: 0.18 });
    expect(onPhaseChange).toHaveBeenLastCalledWith(2);
  });

  it('calls onPhaseChange only when nearest-phase index actually changes', () => {
    const onPhaseChange = vi.fn();
    renderAnimationsWithFixture(onPhaseChange);
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    const cfg = scrollTriggerCreateCalls.find((c) => c.id === 'hiw-stage')!;
    const onUpdate = cfg.onUpdate as (self: { progress: number }) => void;
    onUpdate({ progress: 0.18 }); // → phase 2
    onUpdate({ progress: 0.19 }); // → still phase 2
    onUpdate({ progress: 0.21 }); // → still phase 2
    expect(onPhaseChange).toHaveBeenCalledTimes(1);
    onUpdate({ progress: 0.31 }); // → phase 3
    expect(onPhaseChange).toHaveBeenCalledTimes(2);
    expect(onPhaseChange).toHaveBeenLastCalledWith(3);
  });

  it('writes --hiw-heat CSS variable on the stage element via a gsap quickSetter each onUpdate', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    const stageQuickSetter = quickSetterCalls.find(
      ([, prop]) => prop === '--hiw-heat',
    );
    expect(stageQuickSetter).toBeDefined();
  });

  it('exposes window.__hiwStageTrigger (getters for start/end) only when NODE_ENV !== "production"', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    // vitest sets NODE_ENV to "test" by default.
    const exposed = (
      window as unknown as {
        __hiwStageTrigger?: { start: number; end: number };
      }
    ).__hiwStageTrigger;
    expect(exposed).toBeDefined();
    expect(typeof exposed!.start).toBe('number');
    expect(typeof exposed!.end).toBe('number');
  });
});

describe('HowItWorksAnimations — rail seek (Lenis-native)', () => {
  it('consumes useLenisInstance() at the component top level', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    const btn = document.querySelector<HTMLButtonElement>(
      '[data-hiw-rail="2"]',
    );
    expect(btn).not.toBeNull();
    btn!.click();
    expect(lenisScrollToSpy).toHaveBeenCalled();
  });

  it('attaches a click listener to every [data-hiw-rail] button inside the desktop branch', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    for (let i = 0; i < 5; i++) {
      const btn = document.querySelector<HTMLButtonElement>(
        `[data-hiw-rail="${i}"]`,
      );
      btn!.click();
    }
    expect(lenisScrollToSpy).toHaveBeenCalledTimes(5);
  });

  it('seekToPhase computes labelProgress from master timeline and calls lenis.scrollTo(y, { duration, easing })', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    const btn = document.querySelector<HTMLButtonElement>(
      '[data-hiw-rail="2"]',
    )!;
    btn.click();
    // With our mock: st.start=100, st.end=2000; labels at 0..4, duration=10
    // → phase-2 labelProgress = 2/10 = 0.2 → target = 100 + (2000-100)*0.2 = 480.
    expect(lenisScrollToSpy).toHaveBeenCalled();
    const call = lenisScrollToSpy.mock.calls[0]!;
    expect(call[0]).toBeCloseTo(480, 3);
    expect(call[1]).toMatchObject({
      duration: expect.any(Number),
      easing: expect.any(Function),
    });
  });

  it('cleans up all rail click listeners when the matchMedia branch tears down', () => {
    renderAnimationsWithFixture();
    const branchCleanup = runBranch(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    document
      .querySelector<HTMLButtonElement>('[data-hiw-rail="2"]')!
      .click();
    expect(lenisScrollToSpy).toHaveBeenCalledTimes(1);
    branchCleanup();
    document
      .querySelector<HTMLButtonElement>('[data-hiw-rail="3"]')!
      .click();
    expect(lenisScrollToSpy).toHaveBeenCalledTimes(1);
  });
});

describe('HowItWorksAnimations — reduced-motion', () => {
  it('does NOT register the desktop pinned master timeline', () => {
    renderAnimationsWithFixture();
    runBranch(MATCH_MEDIA.reducedMotion);
    const stageCfg = scrollTriggerCreateCalls.find(
      (cfg) => cfg.id === 'hiw-stage',
    );
    expect(stageCfg).toBeUndefined();
  });

  it('forces svg actor/orbits/halo elements visible via gsap.set', () => {
    renderAnimationsWithFixture();
    runBranch(MATCH_MEDIA.reducedMotion);
    const setTargets = gsapSetCalls.map(([target]) => target);
    expect(setTargets.length).toBeGreaterThan(0);
    const actorSet = gsapSetCalls.find(
      ([, vars]) => (vars as { opacity?: number }).opacity === 1,
    );
    expect(actorSet).toBeDefined();
  });

  it('creates a plain scroll-binned ScrollTrigger for phase dispatch only', () => {
    renderAnimationsWithFixture();
    runBranch(MATCH_MEDIA.reducedMotion);
    expect(scrollTriggerCreateCalls.length).toBeGreaterThan(0);
    const rm = scrollTriggerCreateCalls.find(
      (cfg) => cfg.id !== 'hiw-stage' && !cfg.pin && !cfg.animation,
    );
    expect(rm).toBeDefined();
    expect(rm!.pin).toBeFalsy();
    expect((rm as { animation?: unknown }).animation).toBeUndefined();
  });

  it('returns a kill cleanup on the scroll-binned trigger', () => {
    renderAnimationsWithFixture();
    const branchCleanup = runBranch(MATCH_MEDIA.reducedMotion);
    const trig = lastCreatedTrigger;
    expect(trig).not.toBeNull();
    expect(trig!.kill).not.toHaveBeenCalled();
    branchCleanup();
    expect(trig!.kill).toHaveBeenCalled();
  });
});

describe('HowItWorksAnimations — mobile branch', () => {
  it('creates per-phase-card scroll triggers with once:true start "top 80%" for [data-hiw-phase-card=N]', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(max-width: 899px) and (prefers-reduced-motion: no-preference)',
    );
    const perCardFromCalls = gsapFromCalls.filter(
      ([, vars]) =>
        (vars as { scrollTrigger?: { start?: string; once?: boolean } })
          .scrollTrigger?.start === 'top 80%' &&
        (vars as { scrollTrigger?: { once?: boolean } }).scrollTrigger
          ?.once === true,
    );
    expect(perCardFromCalls.length).toBe(PHASE_COUNT);
  });

  it('does NOT call pin on the mobile branch', () => {
    renderAnimationsWithFixture();
    runBranch(
      '(max-width: 899px) and (prefers-reduced-motion: no-preference)',
    );
    const pinned = scrollTriggerCreateCalls.filter(
      (cfg) => cfg.pin === true,
    );
    expect(pinned.length).toBe(0);
  });
});

describe('HowItWorksAnimations — useGSAP options', () => {
  it('passes scope=containerRef', () => {
    renderAnimationsWithFixture();
    const opts = useGSAPLastOpts as {
      scope?: unknown;
      dependencies?: unknown[];
    };
    expect(opts).toBeDefined();
    expect(opts.scope).toBeDefined();
    expect(
      (opts.scope as { current?: unknown }).current,
    ).toBeDefined();
  });

  it('passes dependencies: [] (deps empty, onPhaseChange captured via ref)', () => {
    renderAnimationsWithFixture();
    const opts = useGSAPLastOpts as {
      dependencies?: unknown[];
    };
    expect(Array.isArray(opts.dependencies)).toBe(true);
    expect(opts.dependencies!.length).toBe(0);
  });
});

describe('HowItWorksAnimations — font-ready refresh', () => {
  it('calls document.fonts?.ready.then(ScrollTrigger.refresh) when the hook fires', async () => {
    const origFonts = (document as unknown as { fonts?: unknown }).fonts;
    const readyPromise = Promise.resolve();
    (document as unknown as { fonts: { ready: Promise<void> } }).fonts = {
      ready: readyPromise,
    };
    renderAnimationsWithFixture();
    // Flush microtasks so the .then(ScrollTrigger.refresh) handler runs.
    await readyPromise;
    await Promise.resolve();
    expect(gsapReg.ScrollTrigger.refresh).toHaveBeenCalled();
    if (origFonts !== undefined) {
      (document as unknown as { fonts?: unknown }).fonts = origFonts;
    } else {
      delete (document as unknown as { fonts?: unknown }).fonts;
    }
  });
});
