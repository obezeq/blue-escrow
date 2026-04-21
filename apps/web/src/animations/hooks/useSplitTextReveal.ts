'use client';

import { type RefObject } from 'react';
import { gsap, SplitText, useGSAP } from '@/animations/config/gsap-register';
import {
  DEFAULT_DURATION,
  DEFAULT_EASE,
  MATCH_MEDIA,
} from '@/animations/config/defaults';

export interface UseSplitTextRevealOptions {
  /** Split type (default: 'words') */
  type?: 'chars' | 'words' | 'lines' | 'words,chars' | 'lines,words';
  /** Stagger between split units (default: 0.03) */
  stagger?: number;
  /** Vertical offset in pixels (default: 40) */
  y?: number;
  /** Animation duration in seconds (default: DEFAULT_DURATION) */
  duration?: number;
  /** Easing function (default: DEFAULT_EASE) */
  ease?: string;
  /** ScrollTrigger start position (default: 'top 80%') */
  start?: string;
  /** Mask type for clip-reveal effect (optional) */
  mask?: 'lines' | 'words' | 'chars';
  /** Only trigger once (default: true) */
  once?: boolean;
}

/**
 * Split text into chars/words/lines and animate on scroll.
 * Uses SplitText.create() with autoSplit for responsive re-splitting.
 * Respects prefers-reduced-motion via gsap.matchMedia().
 *
 * @param scope - Ref to the text element to split
 * @param options - Split and animation configuration
 */
export function useSplitTextReveal(
  scope: RefObject<HTMLElement | null>,
  options: UseSplitTextRevealOptions = {},
) {
  const {
    type = 'words',
    stagger = 0.03,
    y = 40,
    duration = DEFAULT_DURATION,
    ease = DEFAULT_EASE,
    start = 'top 80%',
    mask,
    once = true,
  } = options;

  useGSAP(
    () => {
      if (!scope.current) return;

      const mm = gsap.matchMedia();

      mm.add(MATCH_MEDIA.noReducedMotion, () => {
        SplitText.create(scope.current!, {
          type,
          mask,
          autoSplit: true,
          onSplit(self) {
            // Determine animation targets based on split type
            const splitType = type.split(',').pop()!.trim() as
              | 'chars'
              | 'words'
              | 'lines';
            const targets = self[splitType];

            return gsap.from(targets, {
              y,
              opacity: 0,
              duration,
              ease,
              stagger,
              scrollTrigger: {
                trigger: scope.current,
                start,
                once,
              },
            });
          },
        });
      });

      // Reduced motion: no split, no animation
      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(scope.current!, { clearProps: 'all' });
      });
    },
    { scope },
  );
}
