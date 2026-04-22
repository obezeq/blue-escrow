'use client';

import { useEffect, useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { scheduleRefresh } from '@/animations/config/motion-system';

/**
 * Scroll-in reveal stagger for the v6 FAQ:
 * - head block (eyebrow + heading + subtitle) staggers in together
 * - each faq item fades up on entry
 *
 * Expansion itself is pure CSS (max-height transition + icon rotate),
 * but when a panel opens the page height changes — we refresh
 * ScrollTrigger so downstream pinned sections (hero, hiw) recompute.
 *
 * Refresh triggering: consumers forward each open/close toggle through
 * `refreshKey`. A debounced `scheduleRefresh()` collapses multiple rapid
 * toggles into a single `ScrollTrigger.refresh()` after the trailing edge.
 * The refresh path is gated by matchMedia so reduced-motion users don't
 * pay the cost.
 */
export function FaqAnimations({
  children,
  refreshKey,
}: {
  children: React.ReactNode;
  refreshKey?: number | string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // One-time scroll-reveal setup — independent of `refreshKey` so it does
  // not re-register on every accordion toggle.
  useGSAP(
    () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const eyebrow = container.querySelector('[data-animate="eyebrow"]');
        const heading = container.querySelector('[data-animate="heading"]');
        const subtitle = container.querySelector('[data-animate="subtitle"]');
        const items = container.querySelectorAll('[data-animate="item"]');

        if (eyebrow) {
          gsap.from(eyebrow, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: eyebrow,
              start: 'top 85%',
              once: true,
            },
          });
        }

        if (heading) {
          gsap.from(heading, {
            y: 30,
            opacity: 0,
            duration: 0.9,
            delay: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: heading,
              start: 'top 85%',
              once: true,
            },
          });
        }

        if (subtitle) {
          gsap.from(subtitle, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            delay: 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: subtitle,
              start: 'top 85%',
              once: true,
            },
          });
        }

        if (items.length) {
          gsap.from(items, {
            y: 24,
            opacity: 0,
            duration: 0.8,
            stagger: 0.06,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: items[0],
              start: 'top 90%',
              once: true,
            },
          });
        }
      });

      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(container.querySelectorAll('[data-animate]'), {
          clearProps: 'all',
        });
      });
    },
    { scope: containerRef },
  );

  // Panel open/close -> debounced `ScrollTrigger.refresh()`. Gated on
  // `no-preference` matchMedia so reduced-motion users don't pay the cost.
  // The leading render with `refreshKey === 0` is skipped; only actual
  // flips from the controlled parent fire a refresh.
  const initialRefreshKey = useRef(refreshKey);
  useEffect(() => {
    if (refreshKey === initialRefreshKey.current) return;
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: no-preference)');
    if (!mq.matches) return;
    scheduleRefresh(200);
  }, [refreshKey]);

  return <div ref={containerRef}>{children}</div>;
}
