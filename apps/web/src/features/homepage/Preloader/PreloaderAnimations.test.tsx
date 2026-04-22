import { describe, it, expect, vi, afterEach, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createRef } from 'react';
import { mockMatchMedia } from '@/test/setup';

// Run requestAnimationFrame synchronously in tests so the timeline setup
// inside PreloaderAnimations' useEffect fires within the same tick as
// render(). This mirrors how React flushes layout work for tests but lets
// us stay on real timers for everything else.
let rafOrig: typeof requestAnimationFrame;
beforeAll(() => {
  rafOrig = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof requestAnimationFrame;
});
afterAll(() => {
  globalThis.requestAnimationFrame = rafOrig;
});

// ---------------------------------------------------------------------------
// GSAP mock — captures matchMedia branches + the timeline onComplete so we
// can assert behavior without running any real tweens. Uses vi.hoisted so
// the bindings exist before vi.mock's factory runs (vi.mock is hoisted).
// ---------------------------------------------------------------------------

const {
  mmAdd,
  mmRevert,
  tlOnCompleteRefs,
  gsapSet,
  gsapTo,
  gsapFrom,
  chain,
  splitTextCreate,
  customEaseCreate,
  customEaseGet,
} = vi.hoisted(() => {
  const mmAdd = vi.fn<(query: string, cb: () => void) => void>();
  const mmRevert = vi.fn();
  const tlOnCompleteRefs: Array<() => void> = [];
  const gsapSet = vi.fn();
  const gsapTo = vi.fn();
  const gsapFrom = vi.fn();
  const chain = {
    to: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    kill: vi.fn(),
  };
  const splitTextCreate = vi.fn<
    (targets: unknown, opts: Record<string, unknown>) => { chars: unknown[] }
  >(() => ({ chars: [] }));
  const customEaseCreate = vi.fn();
  const customEaseGet = vi.fn((_name: string) => null as unknown);
  return {
    mmAdd,
    mmRevert,
    tlOnCompleteRefs,
    gsapSet,
    gsapTo,
    gsapFrom,
    chain,
    splitTextCreate,
    customEaseCreate,
    customEaseGet,
  };
});

vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    matchMedia: () => ({
      add: (q: string, cb: () => void) => mmAdd(q, cb),
      revert: mmRevert,
    }),
    set: gsapSet,
    to: gsapTo,
    from: gsapFrom,
    timeline: (opts?: { onComplete?: () => void }) => {
      if (opts?.onComplete) tlOnCompleteRefs.push(opts.onComplete);
      return chain;
    },
  },
  SplitText: { create: splitTextCreate },
  CustomEase: { create: customEaseCreate, get: customEaseGet },
  useGSAP: (cb: () => void | (() => void)) => cb(),
}));

import { PreloaderAnimations } from './PreloaderAnimations';

function renderAnimations(onComplete = vi.fn()) {
  const rootRef = createRef<HTMLDivElement>();
  const markRef = createRef<HTMLDivElement>();
  const trackRef = createRef<HTMLSpanElement>();
  const counterRef = createRef<HTMLSpanElement>();
  const shimmerRef = createRef<HTMLSpanElement>();

  // Build the subtree imperatively and attach it to the document so the
  // ref targets are live when the mocked useGSAP callback runs.
  const host = document.createElement('div');
  document.body.appendChild(host);
  const rootEl = document.createElement('div');
  rootEl.setAttribute('role', 'progressbar');
  const markEl = document.createElement('div');
  const wordEl = document.createElement('span');
  wordEl.setAttribute('data-word', '');
  wordEl.textContent = 'Blue';
  markEl.appendChild(wordEl);
  rootEl.appendChild(markEl);
  const trackEl = document.createElement('span');
  rootEl.appendChild(trackEl);
  const counterEl = document.createElement('span');
  rootEl.appendChild(counterEl);
  const shimmerEl = document.createElement('span');
  markEl.appendChild(shimmerEl);
  host.appendChild(rootEl);

  (rootRef as { current: HTMLDivElement | null }).current = rootEl;
  (markRef as { current: HTMLDivElement | null }).current = markEl;
  (trackRef as { current: HTMLSpanElement | null }).current = trackEl;
  (counterRef as { current: HTMLSpanElement | null }).current = counterEl;
  (shimmerRef as { current: HTMLSpanElement | null }).current = shimmerEl;

  render(
    <PreloaderAnimations
      rootRef={rootRef}
      markRef={markRef}
      trackRef={trackRef}
      counterRef={counterRef}
      shimmerRef={shimmerRef}
      onComplete={onComplete}
    />,
  );

  return { rootEl, markEl, trackEl, counterEl, shimmerEl, host };
}

afterEach(() => {
  cleanup();
  mmAdd.mockClear();
  mmRevert.mockClear();
  gsapSet.mockClear();
  gsapTo.mockClear();
  gsapFrom.mockClear();
  splitTextCreate.mockClear();
  customEaseCreate.mockClear();
  customEaseGet.mockClear();
  customEaseGet.mockReturnValue(null);
  tlOnCompleteRefs.length = 0;
  chain.to.mockClear();
  chain.from.mockClear();
  chain.set.mockClear();
  chain.kill.mockClear();
  // Remove any DOM nodes we attached in renderAnimations without resorting
  // to innerHTML (which flags the harness's XSS heuristic).
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

describe('PreloaderAnimations — timeline wiring', () => {
  it('registers both matchMedia branches', () => {
    renderAnimations();
    const calls = mmAdd.mock.calls.map(([q]) => q);
    expect(calls).toContain('(prefers-reduced-motion: no-preference)');
    expect(calls).toContain('(prefers-reduced-motion: reduce)');
  });

  it('registers the CustomEase introExit if not already defined', () => {
    renderAnimations();
    const noMotionCall = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: no-preference)',
    );
    noMotionCall?.[1]();
    expect(customEaseCreate).toHaveBeenCalledWith(
      'introExit',
      expect.stringMatching(/^M0,0/),
    );
  });

  it('does not recreate introExit if already registered', () => {
    customEaseGet.mockReturnValue({ name: 'introExit' });
    renderAnimations();
    const noMotionCall = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: no-preference)',
    );
    noMotionCall?.[1]();
    expect(customEaseCreate).not.toHaveBeenCalled();
  });

  it('wires onComplete into the gsap timeline', () => {
    const onComplete = vi.fn();
    renderAnimations(onComplete);
    const noMotionCall = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: no-preference)',
    );
    noMotionCall?.[1]();
    expect(tlOnCompleteRefs.length).toBeGreaterThanOrEqual(1);
    tlOnCompleteRefs[0]?.();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('uses SplitText with mask: "chars" for the cinematic reveal', () => {
    renderAnimations();
    const noMotionCall = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: no-preference)',
    );
    noMotionCall?.[1]();
    expect(splitTextCreate).toHaveBeenCalledTimes(1);
    const firstCall = splitTextCreate.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.[1]).toMatchObject({ type: 'chars', mask: 'chars' });
  });
});

describe('PreloaderAnimations — reduced-motion branch', () => {
  it('renders the still without invoking SplitText', () => {
    renderAnimations();
    const reducedCall = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: reduce)',
    );
    reducedCall?.[1]();
    expect(splitTextCreate).not.toHaveBeenCalled();
    expect(gsapSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ '--progress': 1 }),
    );
  });

  it('writes aria-valuenow=100 and counter text=100% immediately', () => {
    const { rootEl, counterEl } = renderAnimations();
    const reducedCall = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: reduce)',
    );
    reducedCall?.[1]();
    expect(rootEl.getAttribute('aria-valuenow')).toBe('100');
    expect(counterEl.textContent).toBe('100%');
  });

  it('fires onComplete at the end of the reduced-motion fade', () => {
    const onComplete = vi.fn();
    renderAnimations(onComplete);
    const reducedCall = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: reduce)',
    );
    reducedCall?.[1]();
    expect(tlOnCompleteRefs.length).toBeGreaterThanOrEqual(1);
    tlOnCompleteRefs.at(-1)?.();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('PreloaderAnimations — matchMedia harness helper', () => {
  beforeEach(() => {
    mockMatchMedia(() => false);
  });

  it('honors the matchMedia reduce query via the shared helper', () => {
    const restore = mockMatchMedia((q) => q.includes('reduce'));
    expect(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    ).toBe(true);
    expect(window.matchMedia('(min-width: 800px)').matches).toBe(false);
    restore();
    expect(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    ).toBe(false);
  });
});
