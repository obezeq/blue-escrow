'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

/**
 * Scroll-in reveal for the v6 Compare band (.invert).
 *
 * Eyebrow + heading + subtitle stagger in at the top, then the table
 * cells do a 3D rotateX card-flip from `-80deg` to `0`, seeded around
 * each cell's bottom edge. Column-first staggering (col * 0.04 + row *
 * 0.06) keeps rows settling left-to-right, matching the reading order.
 *
 * Touch devices (`pointer: coarse`) fall back to a plain y+opacity
 * reveal because iOS Safari has paint spikes on large 3D transform
 * grids. The `perspective` + `transform-style: preserve-3d` live in
 * `Compare.module.scss` behind a `@supports (perspective: 1px)` guard
 * so the CSS is safe in browsers without 3D context.
 */
export function CompareAnimations({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const eyebrow = container.querySelector('[data-animate="eyebrow"]');
        const heading = container.querySelector('[data-animate="heading"]');
        const subtitle = container.querySelector('[data-animate="subtitle"]');
        const cells = container.querySelectorAll('[data-animate="cell"]');
        const tableEl = container.querySelector<HTMLElement>(
          '[class*="compare__table"]',
        );

        if (eyebrow) {
          gsap.from(eyebrow, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: eyebrow, start: 'top 85%', once: true },
          });
        }
        if (heading) {
          gsap.from(heading, {
            y: 30,
            opacity: 0,
            duration: 0.9,
            delay: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: heading, start: 'top 85%', once: true },
          });
        }
        if (subtitle) {
          gsap.from(subtitle, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            delay: 0.2,
            ease: 'power3.out',
            scrollTrigger: { trigger: subtitle, start: 'top 85%', once: true },
          });
        }

        if (cells.length) {
          // Touch / coarse pointer → skip the 3D path. iOS Safari has
          // paint spikes on large rotateX grids; the pre-M11 y+opacity
          // reveal is cheap and looks identical at small viewports.
          const touchDevice =
            typeof window !== 'undefined' &&
            window.matchMedia('(pointer: coarse)').matches;

          const scrollTrigger = tableEl
            ? { trigger: tableEl, start: 'top 92%', once: true }
            : { trigger: cells[0] as Element, start: 'top 92%', once: true };

          if (touchDevice) {
            gsap.from(cells, {
              y: 20,
              opacity: 0,
              duration: 0.5,
              ease: 'power3.out',
              stagger: (i) => {
                const col = i % 4;
                const row = Math.floor(i / 4);
                return col * 0.04 + row * 0.06;
              },
              scrollTrigger,
            });
          } else {
            gsap.from(cells, {
              rotateX: -80,
              transformOrigin: 'center bottom',
              opacity: 0,
              duration: 0.7,
              ease: 'back.out(1.3)',
              stagger: (i) => {
                const col = i % 4;
                const row = Math.floor(i / 4);
                return col * 0.04 + row * 0.06;
              },
              scrollTrigger,
            });
          }
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

  return <div ref={containerRef}>{children}</div>;
}
