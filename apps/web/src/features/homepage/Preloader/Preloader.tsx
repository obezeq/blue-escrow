'use client';

import { useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';
import { markPreloaderDone } from '@/lib/preloader/completion';
import styles from './Preloader.module.scss';

const BLUE_LETTERS = ['B', 'l', 'u', 'e'] as const;
const ESCROW_LETTERS = ['E', 's', 'c', 'r', 'o', 'w'] as const;

// Timing mirrors the CSS: introOut fires at 2.8s, lasts 1.1s; progress bar
// fills over 2.5s after a 0.2s delay; total overlay life ~3.92s + a small
// safety buffer for the clip-path to finish painting before React unmounts.
const COUNTER_START_MS = 200;
const COUNTER_DURATION_MS = 2500;
const HIDE_AFTER_MS = 2800 + 1100 + 120;

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
 * A11y: role='progressbar' with aria-valuenow driven by the same rAF loop
 * that renders the numeric counter (throttled to integer increments so
 * screen readers don't announce every frame). `preloader:done` fires on
 * unmount so HeroAnimations starts without a hard-coded delay.
 */
export function Preloader() {
  const [hidden, setHidden] = useState(false);
  const lenis = useLenis();
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  // Reduced-motion: skip the overlay entirely (no animation, no forced
  // pause) — the page content is revealed immediately.
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    setHidden(true);
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

  // Unmount once the CSS introOut animation has finished; fire the
  // completion signal so HeroAnimations / late subscribers can start.
  useEffect(() => {
    if (hidden) return;
    const timer = window.setTimeout(() => {
      markPreloaderDone();
      setHidden(true);
    }, HIDE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [hidden]);

  // If reduced-motion kicked in and we hide without ever running the
  // timeline, fire the event anyway so downstream hero animations don't
  // wait forever.
  useEffect(() => {
    if (hidden) markPreloaderDone();
  }, [hidden]);

  if (hidden) return null;

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
    </div>
  );
}
