'use client';

import { useRef } from 'react';
import {
  gsap,
  SplitText,
  CustomEase,
  useGSAP,
} from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { SCRUB_DEFAULTS_SAFE } from '@/animations/config/motion-system';
import { onPreloaderExitStart } from '@/lib/preloader/completion';

/**
 * Client wrapper that animates the v6 hero content IN PARALLEL with the
 * preloader exit. Subscribes to the `preloader:exit-start` CustomEvent,
 * which fires the moment the preloader begins its 1.1s clip-path retreat —
 * so by the time the overlay clears at page-absolute t≈3.92s, the hero has
 * already traversed ~40-50% of its entry timeline. No dead frame between
 * intro and hero.
 *
 * The CSS initial state (see HeroSection.module.scss and Header.module.scss)
 * hides `.hero__word`, `[data-animate='*']`, and the nav via
 * `:root.js-loaded:not([data-preloader='done'])` — so SSR and pre-hydration
 * frames paint the hero in its pre-animation state, not its final state.
 * The `fromTo()` tweens here use the same numeric start state as the CSS
 * gate, so the CSS→JS handoff is pixel-identical.
 *
 * Under `prefers-reduced-motion: reduce`, all tweens are skipped and the
 * hidden state is cleared via `gsap.set(..., { clearProps: 'all' })`.
 * Mid-flight hydration (subscriber mounts after the event has fired) is
 * handled by `onPreloaderExitStart`'s race-safe synchronous fallback.
 */
export function HeroAnimations({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Register 'letterPop' CustomEase once per app lifetime. Guarding with
      // `CustomEase.get` keeps HMR / route re-entry from re-registering under
      // the same name (gsap doesn't error on re-register but avoids the
      // dictionary thrash).
      if (!CustomEase.get('letterPop')) {
        CustomEase.create('letterPop', 'M0,0 C0.2,0 0.3,1 1,1');
      }

      // Captured so cleanup can `revert()` SplitText's DOM mutations on
      // unmount. Without this, React strict-mode re-mount, HMR, or route
      // re-entry would stack duplicate wrapping spans on the title.
      let split: SplitText | null = null;

      const unsub = onPreloaderExitStart(() => {
        const container = containerRef.current;
        if (!container) return;

        const mm = gsap.matchMedia();

        mm.add(MATCH_MEDIA.noReducedMotion, () => {
          const nav = document.querySelector<HTMLElement>(
            'header[class*="header"]',
          );
          const words = container.querySelectorAll<HTMLElement>(
            '[class*="hero__word"]',
          );
          const title = container.querySelector<HTMLElement>(
            '[class*="hero__title"]',
          );
          const eyebrow = container.querySelector<HTMLElement>(
            '[data-animate="eyebrow"]',
          );
          const sub = container.querySelector<HTMLElement>(
            '[data-animate="sub"]',
          );
          const ctas = container.querySelector<HTMLElement>(
            '[data-animate="ctas"]',
          );
          const bottom = container.querySelector<HTMLElement>(
            '[data-animate="bottom"]',
          );
          const ticker = container.querySelector<HTMLElement>(
            '[data-animate="ticker"]',
          );

          // Master entry timeline. Starts the instant the preloader begins
          // its 1.1s exit retreat, so the hero is 25-55% animated by the
          // time the overlay finishes clipping away — no dead frame, no
          // snap. Position parameters reference absolute seconds into this
          // local timeline (the timeline itself starts at preloader-exit-
          // start t=2.8s in page-absolute time).
          //
          // `immediateRender: true` on every `fromTo`/`from` is deliberate.
          // Tweens inserted into a timeline default to `immediateRender:
          // false`, which means an element at `position: 0.7s` would stay
          // in its CSS-gated state until its playback began. When the
          // preloader flips `data-preloader='done'` (deactivating the CSS
          // gate), any element GSAP hadn't yet painted would snap to its
          // final visible state — a regression of the exact bug we fix.
          // Forcing immediate render makes GSAP paint the `from` state on
          // every element the moment the timeline is built, so inline
          // styles outrank the departing CSS gate with zero flicker.
          //
          // Position ladder was calibrated against the preloader's bottom-
          // up clip-path reveal (819px/s over 1.1s): elements near the top
          // of the viewport (eyebrow, sub) must start earliest because
          // their viewport strip is revealed first.
          const tl = gsap.timeline({
            defaults: { ease: 'power3.out' },
          });

          // Nav fade-in @ 0 — runs under the overlay while the page is
          // still covered, ensuring the nav is already fully visible when
          // the overlay clears past it.
          if (nav) {
            tl.fromTo(
              nav,
              { autoAlpha: 0 },
              {
                autoAlpha: 1,
                duration: 0.6,
                ease: 'power2.out',
                immediateRender: true,
              },
              0,
            );
          }

          // Outer word rise @ 0.3 — pushed back from 0.15 so the first
          // word finishes just after the overlay clears (page t≈4.1s)
          // instead of burning its animation under a still-receding
          // overlay. Initial yPercent 115 matches the CSS gate exactly.
          if (words.length) {
            tl.fromTo(
              words,
              { yPercent: 115 },
              {
                yPercent: 0,
                duration: 1.0,
                ease: 'power4.out',
                stagger: 0.08,
                immediateRender: true,
              },
              0.3,
            );
          }

          // Char-level rise layered on top of the word rise. SplitText is
          // applied to the title (not individual `.hero__word` wrappers) so
          // a single split covers the full heading — cheaper than N splits,
          // and cleanup only needs to revert one instance.
          if (title) {
            split = SplitText.create(title, { type: 'words,chars' });
            tl.from(
              split.chars,
              {
                yPercent: 115,
                rotateZ: 5,
                duration: 1.1,
                ease: 'letterPop',
                stagger: 0.015,
                immediateRender: true,
              },
              0.25,
            );
          }

          // Support-element fades. Using the same { opacity:0, y:16 } start
          // as the CSS gate so the transition is seamless. Eyebrow and
          // sub pushed earlier (0.05 / 0.15) because they sit at the top
          // of the viewport and are revealed FIRST by the bottom-up
          // clip-path; starting them at 0.25 leaves a ~150ms dead-frame
          // window where the slot is exposed but empty.
          const fades: [HTMLElement | null, number][] = [
            [eyebrow, 0.05],
            [sub, 0.15],
            [ctas, 0.4],
            [bottom, 0.55],
            [ticker, 0.7],
          ];
          fades.forEach(([el, position]) => {
            if (!el) return;
            tl.fromTo(
              el,
              { opacity: 0, y: 16 },
              {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: 'power3.out',
                immediateRender: true,
              },
              position,
            );
          });

          // Scroll parallax: title drifts up + fades as hero scrolls away.
          //
          // `scrub: 0.6` smooths the parallax under Lenis so a sudden
          // page-height change (FAQ accordion opening below the fold)
          // doesn't yank the title. `SCRUB_DEFAULTS_SAFE` adds
          // `invalidateOnRefresh: true` so ScrollTrigger re-measures
          // start/end on refresh, plus `fastScrollEnd: true` to kill
          // chase-jitter on mobile flicks. Left OUTSIDE the entry timeline
          // — it is scroll-driven, not time-driven.
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
                scrub: 0.6,
                ...SCRUB_DEFAULTS_SAFE,
              },
            });
          }
        });

        mm.add(MATCH_MEDIA.reducedMotion, () => {
          // Reduced-motion: instantly reveal everything (CSS gate already
          // neutralises hidden state under @media reduce, but defend
          // against a lingering inline style from a prior tween or HMR).
          const nav = document.querySelector<HTMLElement>(
            'header[class*="header"]',
          );
          if (nav) gsap.set(nav, { clearProps: 'all', autoAlpha: 1 });
          gsap.set(
            container.querySelectorAll('[class*="hero__word"], [data-animate]'),
            { clearProps: 'all', opacity: 1, y: 0, yPercent: 0 },
          );
        });
      });

      return () => {
        unsub();
        // useGSAP auto-kills tweens but does NOT undo SplitText DOM
        // mutations — explicit revert keeps the original text node so a
        // remount doesn't stack another layer of char/word spans.
        if (split) {
          split.revert();
          split = null;
        }
      };
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
