'use client';

import { useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';
import styles from './Preloader.module.scss';

const BLUE_LETTERS = ['B', 'l', 'u', 'e'];
const ESCROW_LETTERS = ['E', 's', 'c', 'r', 'o', 'w'];

// Timing mirrors base.css:134 (introOut fires at 2.8s) + 1.1s exit duration.
// Counter ticks in sync with .track i (2.5s fill with 0.2s delay).
const COUNTER_START_MS = 200;
const COUNTER_DURATION_MS = 2500;
const HIDE_AFTER_MS = 2800 + 1100 + 120; // leave a small safety buffer

export function Preloader() {
  const [hidden, setHidden] = useState(false);
  const lenis = useLenis();
  const counterRef = useRef<HTMLSpanElement>(null);

  // Reduced-motion users: never mount the overlay; reveal the page immediately.
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    setHidden(true);
  }, []);

  // Lock Lenis scroll while the overlay is visible; release on exit.
  useEffect(() => {
    if (!lenis) return;
    if (hidden) {
      lenis.start();
    } else {
      lenis.stop();
    }
  }, [lenis, hidden]);

  // Tick the counter 0 -> 100 via rAF, staying in lockstep with the CSS
  // progress bar fill (width 0 -> 100% over 2.5s, delayed 0.2s).
  useEffect(() => {
    if (hidden) return;
    const el = counterRef.current;
    if (!el) return;

    let rafId = 0;
    let startTimeout = 0;
    let startPerf = 0;

    const tick = () => {
      const elapsed = performance.now() - startPerf;
      const ratio = Math.min(1, elapsed / COUNTER_DURATION_MS);
      el.textContent = `${Math.round(ratio * 100).toString().padStart(3, '0')}%`;
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

  // Un-mount once the CSS introOut animation has finished.
  useEffect(() => {
    if (hidden) return;
    const timer = window.setTimeout(() => setHidden(true), HIDE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [hidden]);

  if (hidden) return null;

  return (
    <div id="intro" className={styles.intro} aria-hidden="true">
      <div className={styles.intro__mark}>
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

      <div className={styles.intro__bar}>
        <span>Initializing protocol</span>
        <span className={styles.intro__track} aria-hidden="true">
          <i />
        </span>
        <span className={styles.intro__num} ref={counterRef}>
          000%
        </span>
      </div>
    </div>
  );
}
