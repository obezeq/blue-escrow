'use client';

import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

/**
 * Scroll-in reveal stagger for the v6 FAQ:
 * - head block (eyebrow + heading + subtitle) staggers in together
 * - each faq item fades up on entry
 *
 * Expansion itself is pure CSS (max-height transition + icon rotate),
 * but when a panel opens the page height changes — we refresh
 * ScrollTrigger so downstream pinned sections (hero, hiw) recompute.
 */
export function FaqAnimations({ children }: { children: React.ReactNode }) {
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

      // When any FAQ item opens/closes the page height changes — refresh
      // ScrollTrigger so upstream pinned sections stay aligned.
      const observer = new MutationObserver(() => {
        ScrollTrigger.refresh();
      });
      container.querySelectorAll('[data-animate="item"]').forEach((item) => {
        observer.observe(item, {
          attributes: true,
          attributeFilter: ['class'],
        });
      });

      return () => observer.disconnect();
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
