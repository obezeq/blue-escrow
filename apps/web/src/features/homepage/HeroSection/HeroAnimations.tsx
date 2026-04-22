'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { onPreloaderDone } from '@/lib/preloader/completion';

// Stagger offsets relative to the preloader:done event. The Preloader used
// to expose these as absolute delays (3.5s / 3.9s); now timing is anchored
// to the actual overlay exit so the sequence stays tight even if the
// preloader timing changes in the future.
const NAV_OFFSET = 0;
const WORDS_OFFSET = 0.4;
const SUPPORT_OFFSET = 0.4;

/**
 * Client wrapper that animates the v6 hero content after the preloader
 * exits. Subscribes to the `preloader:done` CustomEvent instead of relying
 * on a hard-coded delay; if the preloader was already dismissed this
 * session (sessionStorage flag), the sequence runs immediately.
 *
 * Under prefers-reduced-motion: reduce, everything is rendered static at
 * CSS defaults — no tweens, no parallax, no ticker scroll.
 */
export function HeroAnimations({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const unsub = onPreloaderDone(() => {
        const container = containerRef.current;
        if (!container) return;
        const mm = gsap.matchMedia();

        mm.add(MATCH_MEDIA.noReducedMotion, () => {
          const nav = document.querySelector<HTMLElement>(
            'header[class*="header"]',
          );
          if (nav) {
            gsap.set(nav, { autoAlpha: 0 });
            gsap.to(nav, {
              autoAlpha: 1,
              duration: 0.6,
              ease: 'power2.out',
              delay: NAV_OFFSET,
            });
          }

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
              duration: 1.0,
              ease: 'power4.out',
              stagger: 0.08,
              delay: WORDS_OFFSET,
            });
          }

          const fades: [Element | null, number][] = [
            [eyebrow, SUPPORT_OFFSET],
            [sub, SUPPORT_OFFSET],
            [ctas, SUPPORT_OFFSET + 0.2],
            [bottom, SUPPORT_OFFSET + 0.4],
            [ticker, SUPPORT_OFFSET + 0.6],
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
          gsap.set(
            container.querySelectorAll(
              '[class*="hero__word"], [data-animate]',
            ),
            { clearProps: 'all' },
          );
          const nav = document.querySelector<HTMLElement>(
            'header[class*="header"]',
          );
          if (nav) gsap.set(nav, { clearProps: 'all' });
        });
      });

      return () => {
        unsub();
      };
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
