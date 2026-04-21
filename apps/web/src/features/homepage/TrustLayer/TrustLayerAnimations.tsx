'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

/**
 * Scroll-in + marquee animations for the v6 .proof section.
 * - Head block (eyebrow + h2 + subtitle) staggers in
 * - Each .proof__item fades up column-by-column
 * - Each stat counter animates from its `start` text to the `data-count`
 *   numeric value on viewport entry, formatted to data-decimals
 * - The marquee track scrolls -33.333% on a 40s linear infinite loop
 *   (-33.333% because the track contains three repeated phrase spans)
 */
export function TrustLayerAnimations({
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
        const items = container.querySelectorAll('[data-animate="item"]');
        const marqueeTrack = container.querySelector(
          '[data-animate="marquee-track"]',
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

        items.forEach((item, i) => {
          gsap.from(item, {
            y: 30,
            opacity: 0,
            duration: 0.7,
            delay: i * 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: item, start: 'top 85%', once: true },
          });
        });

        items.forEach((item) => {
          const numEl = item.querySelector('[data-count]') as HTMLElement | null;
          const displayEl = item.querySelector(
            '[data-animate-number]',
          ) as HTMLElement | null;
          if (!numEl || !displayEl) return;

          const target = Number(numEl.dataset.count ?? '0');
          const decimals = Number(numEl.dataset.decimals ?? '0');
          const proxy = { value: 0 };

          gsap.to(proxy, {
            value: target,
            duration: 2,
            ease: 'power2.out',
            onUpdate() {
              displayEl.textContent = proxy.value.toFixed(decimals);
            },
            scrollTrigger: {
              trigger: numEl,
              start: 'top 80%',
              once: true,
            },
          });
        });

        if (marqueeTrack) {
          gsap.to(marqueeTrack, {
            xPercent: -33.333,
            duration: 40,
            ease: 'none',
            repeat: -1,
          });
        }
      });

      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(container.querySelectorAll('[data-animate]'), {
          clearProps: 'all',
        });
        // Drop final stat values in without animating.
        container.querySelectorAll('[data-count]').forEach((numEl) => {
          const target = Number((numEl as HTMLElement).dataset.count ?? '0');
          const decimals = Number(
            (numEl as HTMLElement).dataset.decimals ?? '0',
          );
          const displayEl = numEl.querySelector(
            '[data-animate-number]',
          ) as HTMLElement | null;
          if (displayEl) displayEl.textContent = target.toFixed(decimals);
        });
      });
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
