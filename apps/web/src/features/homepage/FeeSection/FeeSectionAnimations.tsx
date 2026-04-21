'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

/**
 * Ports the scroll-in reveal for the v6 .fees section:
 * - The giant 0.33% number fades up with a slight scale settle
 * - Eyebrow + h2 stagger in after the number lands
 * - Body paragraphs + competitor row reveal together below
 *
 * Reduced motion leaves everything visible.
 */
export function FeeSectionAnimations({
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
        const number = container.querySelector('[data-animate="number"]');
        const eyebrow = container.querySelector('[data-animate="eyebrow"]');
        const heading = container.querySelector('[data-animate="heading"]');
        const bodies = container.querySelectorAll('[data-animate="body"]');
        const row = container.querySelector('[data-animate="row"]');

        if (number) {
          gsap.from(number, {
            scale: 1.08,
            opacity: 0,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: number,
              start: 'top 80%',
              once: true,
            },
          });
        }

        if (eyebrow) {
          gsap.from(eyebrow, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            delay: 0.15,
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
            delay: 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: heading,
              start: 'top 85%',
              once: true,
            },
          });
        }

        if (bodies.length) {
          gsap.from(bodies, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: bodies[0],
              start: 'top 85%',
              once: true,
            },
          });
        }

        if (row) {
          gsap.from(row, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: row,
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

  return <div ref={containerRef}>{children}</div>;
}
