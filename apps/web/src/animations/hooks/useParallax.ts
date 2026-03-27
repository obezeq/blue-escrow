'use client';

import { type RefObject } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

export interface UseParallaxOptions {
  /** Speed multiplier — higher = more movement (default: 0.5) */
  speed?: number;
  /** Direction of parallax movement (default: 'y') */
  direction?: 'y' | 'x';
  /** ScrollTrigger start position (default: 'top bottom') */
  start?: string;
  /** ScrollTrigger end position (default: 'bottom top') */
  end?: string;
}

/**
 * Parallax movement on scroll using scrub.
 * Respects prefers-reduced-motion via gsap.matchMedia().
 *
 * @param scope - Ref to the element to apply parallax to
 * @param options - Parallax configuration
 */
export function useParallax(
  scope: RefObject<HTMLElement | null>,
  options: UseParallaxOptions = {},
) {
  const {
    speed = 0.5,
    direction = 'y',
    start = 'top bottom',
    end = 'bottom top',
  } = options;

  useGSAP(
    () => {
      if (!scope.current) return;

      const mm = gsap.matchMedia();

      mm.add(MATCH_MEDIA.noReducedMotion, () => {
        const distance = scope.current!.offsetHeight * speed;

        gsap.to(scope.current!, {
          [direction]: -distance,
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start,
            end,
            scrub: true,
          },
        });
      });
    },
    { scope },
  );
}
