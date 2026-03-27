'use client';

import { type RefObject } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/animations/config/gsap-register';
import {
  DEFAULT_DURATION,
  DEFAULT_EASE,
  MATCH_MEDIA,
} from '@/animations/config/defaults';

export interface UseRevealOnScrollOptions {
  /** Vertical offset in pixels (default: 60) */
  y?: number;
  /** Animation duration in seconds (default: DEFAULT_DURATION) */
  duration?: number;
  /** Easing function (default: DEFAULT_EASE) */
  ease?: string;
  /** ScrollTrigger start position (default: 'top 80%') */
  start?: string;
  /** Only trigger once (default: true) */
  once?: boolean;
  /** Delay before animation starts (default: 0) */
  delay?: number;
  /** Stagger between children (default: 0) */
  stagger?: number;
  /** Selector for children to animate (default: animates the element itself) */
  selector?: string;
}

/**
 * Reveal elements on scroll with fade-in-up animation.
 * Respects prefers-reduced-motion via gsap.matchMedia().
 *
 * @param scope - Ref to the container element
 * @param options - Animation configuration
 */
export function useRevealOnScroll(
  scope: RefObject<HTMLElement | null>,
  options: UseRevealOnScrollOptions = {},
) {
  const {
    y = 60,
    duration = DEFAULT_DURATION,
    ease = DEFAULT_EASE,
    start = 'top 80%',
    once = true,
    delay = 0,
    stagger = 0,
    selector,
  } = options;

  useGSAP(
    () => {
      if (!scope.current) return;

      const mm = gsap.matchMedia();

      mm.add(MATCH_MEDIA.noReducedMotion, () => {
        const targets = selector || scope.current;

        gsap.from(targets!, {
          y,
          opacity: 0,
          duration,
          ease,
          delay,
          stagger,
          scrollTrigger: {
            trigger: scope.current,
            start,
            once,
          },
        });
      });

      mm.add(MATCH_MEDIA.reducedMotion, () => {
        const targets = selector || scope.current;
        gsap.set(targets!, { clearProps: 'all' });
      });
    },
    { scope },
  );
}
