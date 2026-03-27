'use client';

import { type RefObject } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

export interface UseCountUpOptions {
  /** Target number to count up to */
  end: number;
  /** Starting number (default: 0) */
  start?: number;
  /** Animation duration in seconds (default: 2) */
  duration?: number;
  /** Number of decimal places (default: 0) */
  decimals?: number;
  /** Text prefix, e.g. "$" (default: '') */
  prefix?: string;
  /** Text suffix, e.g. "B" (default: '') */
  suffix?: string;
  /** Thousands separator, e.g. "," (default: ',') */
  separator?: string;
  /** ScrollTrigger start position (default: 'top 80%') */
  scrollTriggerStart?: string;
}

function formatNumber(
  value: number,
  decimals: number,
  separator: string,
): string {
  const fixed = value.toFixed(decimals);
  if (!separator) return fixed;

  const [intPart, decPart] = fixed.split('.');
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return decPart ? `${withSep}.${decPart}` : withSep;
}

/**
 * Animate a number counting up on viewport enter.
 * Uses gsap.utils.snap for clean values during animation.
 * Respects prefers-reduced-motion via gsap.matchMedia().
 *
 * @param scope - Ref to the element displaying the number
 * @param options - Counter configuration
 */
export function useCountUp(
  scope: RefObject<HTMLElement | null>,
  options: UseCountUpOptions,
) {
  const {
    end,
    start = 0,
    duration = 2,
    decimals = 0,
    prefix = '',
    suffix = '',
    separator = ',',
    scrollTriggerStart = 'top 80%',
  } = options;

  useGSAP(
    () => {
      if (!scope.current) return;

      const el = scope.current;
      const snapValue = decimals === 0 ? 1 : Math.pow(10, -decimals);
      const snap = gsap.utils.snap(snapValue);

      const setDisplay = (value: number) => {
        const snapped = snap(value);
        el.textContent = `${prefix}${formatNumber(snapped, decimals, separator)}${suffix}`;
      };

      const mm = gsap.matchMedia();

      mm.add(MATCH_MEDIA.noReducedMotion, () => {
        const proxy = { value: start };

        // Set initial display
        setDisplay(start);

        gsap.to(proxy, {
          value: end,
          duration,
          ease: 'power2.out',
          onUpdate() {
            setDisplay(proxy.value);
          },
          scrollTrigger: {
            trigger: el,
            start: scrollTriggerStart,
            once: true,
          },
        });
      });

      mm.add(MATCH_MEDIA.reducedMotion, () => {
        setDisplay(end);
      });
    },
    { scope },
  );
}
