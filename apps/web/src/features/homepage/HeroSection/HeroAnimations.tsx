'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

// v6 timing, verified against main.js:77-88 + hero.css:375-416:
//  - Nav fade-in at 3.5s (during intro exit, before title words land)
//  - Title words lift at 3.9s stagger 0.08, 1.0s, power4.out (v6 CSS delay 3.25/3.42s)
//  - Supporting rows (eyebrow / sub / ctas / meta / ticker) fade from 3.9s
const INTRO_DELAY_NAV = 3.5;
const INTRO_DELAY_WORDS = 3.9;
const INTRO_DELAY_SUPPORT = 3.9;

/**
 * Client wrapper that animates the v6 hero content after the preloader exits.
 * Nav fades in first, words rise into place, supporting rows fade up, then
 * the title parallaxes as the user scrolls past the hero.
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
        // Nav intro fade — matches v6 main.js:79 which fades .nav in at
        // timeline position -0.55s relative to intro exit (~3.5s absolute).
        // We query outside the scoped container since <Header> lives in the
        // marketing layout, above HeroSection in the DOM.
        const nav = document.querySelector<HTMLElement>(
          'header[class*="header"]',
        );
        if (nav) {
          gsap.set(nav, { autoAlpha: 0 });
          gsap.to(nav, {
            autoAlpha: 1,
            duration: 0.6,
            ease: 'power2.out',
            delay: INTRO_DELAY_NAV,
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
        // Static end state: words in place, supporting rows visible, nav
        // visible, parallax disabled. clearProps removes any yPercent/opacity
        // the no-preference branch set if the user flips preference at runtime.
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
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
