'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';
import {
  isPreloaderDone,
  markPreloaderDone,
} from '@/lib/preloader/completion';
import { PreloaderAnimations } from './PreloaderAnimations';
import styles from './Preloader.module.scss';

/**
 * Theme-invariant homepage intro overlay.
 *
 * The overlay looks identical under [data-theme='light'] and
 * [data-theme='dark']: brand tokens are theme-agnostic, and every other
 * value consumed by the SCSS module is scoped local to .intro.
 *
 * Lifecycle:
 *   - Skipped on subsequent same-session visits (sessionStorage flag).
 *   - Sets [data-preloader="active"] on <html> for the CSS scroll lock.
 *   - Locks Lenis and (as a fallback) the body via that attribute.
 *   - Delegates timing to PreloaderAnimations; fires `preloader:done` on
 *     completion so HeroAnimations can kick off without a hard-coded delay.
 */
export function Preloader() {
  // Skip immediately if the user has already watched the intro this session.
  const skipOnMountRef = useRef<boolean>(
    typeof document === 'undefined' ? false : isPreloaderDone(),
  );
  const [mounted, setMounted] = useState<boolean>(!skipOnMountRef.current);
  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const shimmerRef = useRef<HTMLSpanElement>(null);
  const lenis = useLenis();

  // Re-fire preloader:done once on mount if the session flag already
  // indicates we ran through the intro — lets late-subscribing animations
  // (HeroAnimations) start without waiting for an event that will never come.
  useEffect(() => {
    if (skipOnMountRef.current) {
      markPreloaderDone();
    }
    // Intentional: skipOnMountRef is captured once at component instantiation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll lock via data attribute — survives any hydration / Lenis race.
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    html.dataset.preloader = 'active';
    return () => {
      if (html.dataset.preloader === 'active') {
        html.dataset.preloader = 'done';
      }
    };
  }, [mounted]);

  // Lenis hard stop — released from handleComplete via the timeline onComplete.
  useEffect(() => {
    if (!mounted || !lenis) return;
    lenis.stop();
    return () => {
      lenis.start();
    };
  }, [lenis, mounted]);

  const handleComplete = useCallback(() => {
    markPreloaderDone();
    setMounted(false);
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={rootRef}
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
      <div className={styles.intro__conic} aria-hidden="true" />
      <div className={styles.intro__mesh} aria-hidden="true" />
      <div className={styles.intro__grain} aria-hidden="true" />

      <div ref={markRef} className={styles.intro__mark} aria-hidden="true">
        <span data-word className={styles.intro__word}>
          Blue
        </span>
        <span aria-hidden="true">&nbsp;</span>
        <span
          data-word
          className={`${styles.intro__word} ${styles['intro__word--italic']}`}
        >
          Escrow
        </span>
        <span
          ref={shimmerRef}
          className={styles.intro__shimmer}
          aria-hidden="true"
        />
      </div>

      <div className={styles.intro__bar} aria-hidden="true">
        <span className={styles.intro__label}>Initializing protocol</span>
        <span ref={trackRef} className={styles.intro__track}>
          <i className={styles.intro__fill} />
        </span>
        <span ref={counterRef} className={styles.intro__num}>
          000%
        </span>
      </div>

      <PreloaderAnimations
        rootRef={rootRef}
        markRef={markRef}
        trackRef={trackRef}
        counterRef={counterRef}
        shimmerRef={shimmerRef}
        onComplete={handleComplete}
      />
    </div>
  );
}
