'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

// Timing mirrors v6 hero CSS delays (Blue Escrow v6.html CSS 375-377 + 339/398/409/416/455):
//  - Title words start after the intro overlay finishes (~3.1s)
//  - Eyebrow / subtitle / CTAs / bottom meta / ticker fade in from 3.9s onward
// Kept in JS so reduced-motion can bypass the entire sequence cleanly.
const INTRO_DELAY_WORDS = 3.1;
const INTRO_DELAY_SUPPORT = 3.9;

/**
 * Client wrapper that animates the v6 hero content after the preloader exits.
 * Words rise into place, supporting rows fade up, then the title parallaxes as
 * the user scrolls past the hero.
 *
 * Under prefers-reduced-motion: reduce, everything is rendered static at
 * CSS defaults — no tweens, no parallax, no ticker scroll.
 */
export function HeroAnimations({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const mm = gsap.matchMedia();

      mm.add(MATCH_MEDIA.noReducedMotion, () => {
        const words = container.querySelectorAll<HTMLElement>(
          '[class*="hero__word"]',
        );
        const eyebrow = container.querySelector('[data-animate="eyebrow"]');
        const sub = container.querySelector('[data-animate="sub"]');
        const ctas = container.querySelector('[data-animate="ctas"]');
        const bottom = container.querySelector('[data-animate="bottom"]');
        const ticker = container.querySelector('[data-animate="ticker"]');

        if (words.length) {
          gsap.set(words, { yPercent: 115 });
          gsap.to(words, {
            yPercent: 0,
            duration: 1.2,
            ease: 'power3.out',
            stagger: 0.12,
            delay: INTRO_DELAY_WORDS,
          });
        }

        const fades: [Element | null, number][] = [
          [eyebrow, INTRO_DELAY_SUPPORT],
          [sub, INTRO_DELAY_SUPPORT],
          [ctas, INTRO_DELAY_SUPPORT + 0.2],
          [bottom, INTRO_DELAY_SUPPORT + 0.4],
          [ticker, INTRO_DELAY_SUPPORT + 0.6],
        ];
        fades.forEach(([el, delay]) => {
          if (!el) return;
          gsap.set(el, { opacity: 0, y: 16 });
          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            delay,
          });
        });

        // Scroll parallax: title drifts up + fades as hero scrolls away.
        const title = container.querySelector<HTMLElement>(
          '[class*="hero__title"]',
        );
        const parent = container.closest<HTMLElement>('header');
        if (title && parent) {
          gsap.to(title, {
            yPercent: -20,
            opacity: 0.2,
            ease: 'none',
            scrollTrigger: {
              trigger: parent,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        }
      });

      mm.add(MATCH_MEDIA.reducedMotion, () => {
        // Static end state: words fully in place, supporting rows visible,
        // parallax disabled. clearProps removes any yPercent/opacity the
        // no-preference branch set above if preference flips at runtime.
        gsap.set(
          container.querySelectorAll(
            '[class*="hero__word"], [data-animate]',
          ),
          { clearProps: 'all' },
        );
      });
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
