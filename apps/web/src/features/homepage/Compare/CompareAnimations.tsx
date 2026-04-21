'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

/**
 * Scroll-in reveal for the v6 Compare band (.invert).
 * Eyebrow + heading + subtitle stagger in at the top, then every cell
 * in the table fades up with a column-first stagger so rows settle
 * left-to-right. Cheap and sturdy — no pin, no scrub.
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

        cells.forEach((cell, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          gsap.from(cell, {
            y: 20,
            opacity: 0,
            duration: 0.5,
            delay: col * 0.04 + row * 0.06,
            ease: 'power3.out',
            scrollTrigger: { trigger: cell, start: 'top 92%', once: true },
          });
        });
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
