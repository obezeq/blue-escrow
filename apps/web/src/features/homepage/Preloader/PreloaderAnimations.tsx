'use client';

import { useEffect, useRef, type RefObject } from 'react';
import {
  gsap,
  SplitText,
  CustomEase,
} from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

type PreloaderRefs = {
  rootRef: RefObject<HTMLDivElement | null>;
  markRef: RefObject<HTMLDivElement | null>;
  trackRef: RefObject<HTMLSpanElement | null>;
  counterRef: RefObject<HTMLSpanElement | null>;
  shimmerRef: RefObject<HTMLSpanElement | null>;
  onComplete: () => void;
};

// Signature Awwwards exit ease — slow cinematic middle, sharp finish.
const INTRO_EXIT_EASE = 'M0,0 C0.18,0.01 0.12,1.01 1,1';

/**
 * Drives the Preloader's GSAP timeline.
 *
 * Two branches via gsap.matchMedia():
 *   - no-reduced-motion: letter reveal (SplitText mask) → progress 0→1 →
 *     diagonal shimmer → tiny per-letter yoyo → two-stage exit.
 *   - reduced-motion: render the branded end-state and fade in/out.
 *
 * Both branches call `onComplete` at the exact frame the overlay should
 * unmount, so the parent's scroll lock and session flag can release in sync.
 *
 * Uses a plain useEffect (rather than useGSAP) so we can guarantee exactly
 * one timeline is ever created even under React StrictMode's practice
 * mount/unmount cycle — our own cleanup cancels the deferred-frame setup
 * and manually kills the timeline + matchMedia.
 */
export function PreloaderAnimations(props: PreloaderRefs) {
  const rafRef = useRef<number | null>(null);
  const mmRef = useRef<gsap.MatchMedia | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Defer one frame so every parent-owned ref has been committed by
    // React before we read .current values and bind tweens.
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;

      const mark = props.markRef.current;
      const track = props.trackRef.current;
      const root = props.rootRef.current;
      if (!mark || !track || !root) return;

      if (!CustomEase.get('introExit')) {
        CustomEase.create('introExit', INTRO_EXIT_EASE);
      }

      let lastPct = -1;
      const writeProgress = (ratio: number) => {
        const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
        if (pct === lastPct) return;
        lastPct = pct;
        root.setAttribute('aria-valuenow', String(pct));
        const counter = props.counterRef.current;
        if (counter) {
          counter.textContent = `${pct.toString().padStart(3, '0')}%`;
        }
      };

      const mm = gsap.matchMedia();
      mmRef.current = mm;

      mm.add(MATCH_MEDIA.noReducedMotion, () => {
        const words = mark.querySelectorAll<HTMLElement>('[data-word]');
        // SplitText `mask: 'chars'` gives each char its own overflow:
        // hidden wrapper — a true cinematic slit reveal with no CSS
        // workarounds.
        const split = SplitText.create(words, {
          type: 'chars',
          mask: 'chars',
          charsClass: 'intro__ch',
        });

        gsap.set(split.chars, { yPercent: 115 });
        gsap.set(track, { '--progress': 0 });
        gsap.set(props.shimmerRef.current, { xPercent: -120 });
        writeProgress(0);

        const tl = gsap.timeline({ onComplete: props.onComplete });
        tlRef.current = tl;

        // 0.2s → 1.2s: letters rise through their masks.
        tl.to(
          split.chars,
          {
            yPercent: 0,
            duration: 1.0,
            ease: 'power4.out',
            stagger: { each: 0.04, from: 'start' },
          },
          0.2,
        );

        // 0.2s → 2.7s: progress 0 → 1 via the Houdini-registered number var.
        tl.to(
          track,
          {
            '--progress': 1,
            duration: 2.5,
            ease: 'power1.inOut',
            onUpdate() {
              const n = Number(
                getComputedStyle(track).getPropertyValue('--progress'),
              );
              writeProgress(n);
            },
            onComplete() {
              writeProgress(1);
            },
          },
          0.2,
        );

        // 1.6s: one-shot diagonal shimmer sweep across the wordmark.
        if (props.shimmerRef.current) {
          tl.to(
            props.shimmerRef.current,
            {
              xPercent: 220,
              duration: 1.1,
              ease: 'power2.inOut',
            },
            1.6,
          );
        }

        // 2.0s → 2.8s: tiny per-letter drift (alive, not jittery).
        tl.to(
          split.chars,
          {
            yPercent: -2,
            duration: 0.4,
            ease: 'sine.inOut',
            stagger: { each: 0.03, yoyo: true, repeat: 1 },
          },
          2.0,
        );

        // 2.8s: wordmark pre-empts the overlay.
        tl.to(
          mark,
          {
            yPercent: -8,
            opacity: 0,
            duration: 0.7,
            ease: 'introExit',
          },
          2.8,
        );

        // 2.95s: overlay clip-paths itself up and off.
        tl.to(
          root,
          {
            clipPath: 'inset(0 0 100% 0)',
            duration: 1.0,
            ease: 'introExit',
          },
          2.95,
        );
      });

      mm.add(MATCH_MEDIA.reducedMotion, () => {
        // Static branded still — no letter reveal, no shimmer, no
        // clip-path. Short fade-in, hold, fade-out.
        gsap.set(track, { '--progress': 1 });
        writeProgress(1);

        const tl = gsap
          .timeline({ onComplete: props.onComplete })
          .from(root, { opacity: 0, duration: 0.4 })
          .to(root, { opacity: 1, duration: 1.4 })
          .to(root, { opacity: 0, duration: 0.6 });
        tlRef.current = tl;
      });
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (tlRef.current) {
        tlRef.current.kill();
        tlRef.current = null;
      }
      if (mmRef.current) {
        mmRef.current.revert();
        mmRef.current = null;
      }
    };
    // Intentional: refs + onComplete are captured at first mount; we never
    // want to tear down and rebuild the timeline on their identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
