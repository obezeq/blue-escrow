'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';
import {
  isPreloaderDone,
  markPreloaderDone,
  markPreloaderExitStart,
} from '@/lib/preloader/completion';
import styles from './Preloader.module.scss';

const BLUE_LETTERS = ['B', 'l', 'u', 'e'] as const;
const ESCROW_LETTERS = ['E', 's', 'c', 'r', 'o', 'w'] as const;

// Baseline timing mirrors the CSS: introOut fires at 2.8s, lasts 1.1s;
// progress bar fills over 2.5s after a 0.2s delay; total overlay life
// ~3.92s + a small safety buffer for the clip-path to finish painting
// before React unmounts.
const COUNTER_START_MS = 200;
const COUNTER_DURATION_MS = 2500;
const HIDE_AFTER_MS_DEFAULT = 2800 + 1100 + 120;
// Compressed timing for 2g / slow-2g. LCP ships as soon as the letters land.
const HIDE_AFTER_MS_SLOW_NET = 1600;
// CSS `introOut` keyframe fires at `animation-delay: 2.8s`; we sync the
// exit-start signal to that same instant so HeroAnimations can overlap
// its entry timeline with the overlay's retreat (no dead frame).
const EXIT_START_MS_DEFAULT = 2800;
// Slow-net path: preloader hides at 1.6s; fire exit-start a small beat
// earlier so the hero still gets overlap on degraded links.
const EXIT_START_MS_SLOW_NET = 1200;
// How long the overlay must be visible before the "Tap to skip" affordance
// appears. Shorter than the letter-in stagger end (≈1.1s) so it feels
// discoverable, but long enough to not steal attention from the wordmark.
const SKIP_AFFORDANCE_DELAY_MS = 1500;

type NetworkInformation = { effectiveType?: string };

function getPreloaderBudget(): number {
  if (typeof navigator === 'undefined') return HIDE_AFTER_MS_DEFAULT;
  const conn = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
  const et = conn?.effectiveType;
  if (et === '2g' || et === 'slow-2g') return HIDE_AFTER_MS_SLOW_NET;
  return HIDE_AFTER_MS_DEFAULT;
}

function getExitStartOffset(): number {
  if (typeof navigator === 'undefined') return EXIT_START_MS_DEFAULT;
  const conn = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
  const et = conn?.effectiveType;
  if (et === '2g' || et === 'slow-2g') return EXIT_START_MS_SLOW_NET;
  return EXIT_START_MS_DEFAULT;
}

function prefersReducedMotionAtMount(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Homepage intro overlay.
 *
 * Visual: theme-aware. Dark mode uses the original radial ink vignette
 * (#0066ff -> #001b4d -> #000). Light mode overrides the background via
 * [data-theme='light'] with a blue-only mesh of --blue-primary and
 * --blue-vivid — no black, white text, WCAG AAA contrast preserved.
 *
 * Motion: CSS-driven. Letters rise through a word-level clip-path buffer
 * (italic ink overshoots are reserved with inline-axis bleed, so "Escrow"
 * doesn't get shaved). A hairline progress bar fills over 2.5s; exit at
 * 2.8s slides up + clip-paths away over 1.1s.
 *
 * Timing: adaptive. On 2g / slow-2g (`navigator.connection.effectiveType`)
 * the budget compresses from ~4.0s to 1.6s so LCP ships fast on degraded
 * links. Users can also tap/click/Enter/Space on the overlay to skip at
 * any time (the affordance label fades in after 1.5s).
 *
 * A11y: `role="progressbar"` with aria-valuenow driven by the same rAF
 * loop that renders the numeric counter (throttled to integer increments
 * so screen readers don't announce every frame). A secondary skip control
 * — `role="button"` with tabindex/keyboard handlers — sits inside the
 * overlay for discoverable keyboard dismissal. `preloader:done` fires
 * exactly once (guarded by `isPreloaderDone()`) so downstream subscribers
 * (HeroAnimations) see a single hand-off.
 *
 * Fires `preloader:exit-start` at ~2.8s (1.2s on slow-2g) to let downstream
 * entry animations overlap with the overlay retreat; fires `preloader:done`
 * at ~3.92s (1.6s on slow-2g) after `clip-path` settles.
 */
export function Preloader() {
  // Initialize `hidden` lazily so reduced-motion skips the overlay on
  // first paint without a post-mount `setState` (React 19's
  // `react-hooks/set-state-in-effect` rule fires on the old pattern).
  const [hidden, setHidden] = useState<boolean>(() =>
    prefersReducedMotionAtMount(),
  );
  const lenis = useLenis();
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [showSkipHint, setShowSkipHint] = useState(false);

  // Coalesces the exit: marks the completion flag, fires the event once,
  // and unmounts the overlay. Safe to call from timeout, click, or
  // keyboard — `markPreloaderDone()` is a no-op when already done, and
  // the local `hidden` flag prevents re-renders.
  const finish = useCallback(() => {
    // Exit-start goes first so handoff subscribers fire before completion.
    // Both functions are idempotent; the scheduled timer above + this call
    // + a second skip tap all coalesce safely.
    markPreloaderExitStart();
    if (!isPreloaderDone()) {
      markPreloaderDone();
    }
    setHidden((prev) => (prev ? prev : true));
  }, []);

  // Scroll lock + body-level CSS fallback via [data-preloader='active'].
  useEffect(() => {
    if (hidden) return;
    const html = document.documentElement;
    html.dataset.preloader = 'active';
    return () => {
      if (html.dataset.preloader === 'active') {
        html.dataset.preloader = 'done';
      }
    };
  }, [hidden]);

  useEffect(() => {
    if (!lenis) return;
    if (hidden) {
      lenis.start();
    } else {
      lenis.stop();
    }
  }, [lenis, hidden]);

  // Tick the counter 0 -> 100 via rAF, staying in lockstep with the CSS
  // progress bar fill (width 0 -> 100% over 2.5s, delayed 0.2s). Each tick
  // also writes aria-valuenow on the root progressbar, throttled to integer
  // increments so NVDA/JAWS don't announce every frame.
  useEffect(() => {
    if (hidden) return;
    const counter = counterRef.current;
    const root = rootRef.current;
    if (!counter || !root) return;

    let rafId = 0;
    let startTimeout = 0;
    let startPerf = 0;
    let lastPct = -1;

    const tick = () => {
      const elapsed = performance.now() - startPerf;
      const ratio = Math.min(1, elapsed / COUNTER_DURATION_MS);
      const pct = Math.round(ratio * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        counter.textContent = `${pct.toString().padStart(3, '0')}%`;
        root.setAttribute('aria-valuenow', String(pct));
      }
      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    startTimeout = window.setTimeout(() => {
      startPerf = performance.now();
      rafId = requestAnimationFrame(tick);
    }, COUNTER_START_MS);

    return () => {
      window.clearTimeout(startTimeout);
      cancelAnimationFrame(rafId);
    };
  }, [hidden]);

  // Unmount once the (possibly compressed) intro budget has elapsed;
  // `finish()` is idempotent so a prior click/reduced-motion path does
  // not cause a second `preloader:done` dispatch.
  useEffect(() => {
    if (hidden) return;
    const budget = getPreloaderBudget();
    const timer = window.setTimeout(finish, budget);
    return () => window.clearTimeout(timer);
  }, [hidden, finish]);

  // Fire `preloader:exit-start` in sync with the CSS `introOut` kickoff so
  // HeroAnimations can begin its entry timeline WHILE the overlay is still
  // retreating (overlap eliminates the "dead frame" of a fully-landed hero
  // visible under a receding intro). `markPreloaderExitStart` is idempotent
  // and a no-op if skip/reduced-motion already called it via `finish()`.
  useEffect(() => {
    if (hidden) return;
    const offset = getExitStartOffset();
    const timer = window.setTimeout(markPreloaderExitStart, offset);
    return () => window.clearTimeout(timer);
  }, [hidden]);

  // Reveal the "Tap to skip" hint after a short idle so it doesn't steal
  // focus from the wordmark entrance.
  useEffect(() => {
    if (hidden) return;
    const t = window.setTimeout(
      () => setShowSkipHint(true),
      SKIP_AFFORDANCE_DELAY_MS,
    );
    return () => window.clearTimeout(t);
  }, [hidden]);

  // If reduced-motion kicked in at mount and we are already hidden, still
  // emit the completion signal exactly once so HeroAnimations can proceed.
  //
  // This effect ONLY syncs the "preloader done" flag with the external
  // document-level event bus — it deliberately does NOT call `finish()`
  // (which would re-setHidden) to satisfy the
  // `react-hooks/set-state-in-effect` rule. `markPreloaderDone()` is
  // idempotent thanks to the `isPreloaderDone()` guard, so running it on
  // every `hidden=true` render is safe and won't double-dispatch.
  useEffect(() => {
    if (hidden && !isPreloaderDone()) {
      markPreloaderExitStart();
      markPreloaderDone();
    }
  }, [hidden]);

  if (hidden) return null;

  const onSkipKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      finish();
    }
  };

  return (
    <div
      ref={rootRef}
      id="intro"
      className={styles.intro}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-label="Loading Blue Escrow"
      aria-live="polite"
      aria-busy="true"
      data-preloader="mounted"
    >
      <div className={styles.intro__mark} aria-hidden="true">
        <span className={styles.intro__word}>
          {BLUE_LETTERS.map((char, i) => (
            <span
              key={`b-${i}`}
              className={styles.intro__letter}
              style={{ animationDelay: `${0.25 + i * 0.05}s` }}
            >
              {char}
            </span>
          ))}
        </span>
        <span>&nbsp;</span>
        <span
          className={`${styles.intro__word} ${styles['intro__word--italic']}`}
        >
          {ESCROW_LETTERS.map((char, i) => (
            <span
              key={`e-${i}`}
              className={styles.intro__letter}
              style={{ animationDelay: `${0.55 + i * 0.05}s` }}
            >
              {char}
            </span>
          ))}
        </span>
      </div>

      <div className={styles.intro__bar} aria-hidden="true">
        <span>Initializing protocol</span>
        <span className={styles.intro__track}>
          <i />
        </span>
        <span className={styles.intro__num} ref={counterRef}>
          000%
        </span>
      </div>

      {/* Keyboard- and click-accessible skip control. Static presentation
          lives in Preloader.module.scss (`.intro__skip`); the --visible
          modifier flips opacity + pointer-events once `showSkipHint` goes
          true ~1.5s in. DOM node exists from mount so screen readers
          discover it. */}
      <button
        type="button"
        aria-label="Skip preloader"
        onClick={finish}
        onKeyDown={onSkipKey}
        className={`${styles.intro__skip}${showSkipHint ? ` ${styles['intro__skip--visible']}` : ''}`}
      >
        Tap to skip
      </button>
    </div>
  );
}
