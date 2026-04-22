'use client';

import { useRef } from 'react';
import {
  gsap,
  SplitText,
  useGSAP,
  ScrollTrigger,
} from '@/animations/config/gsap-register';
import { Observer } from 'gsap/Observer';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { registerProblemEases, PROBLEM_EASE_NAMES } from './problem-eases';

/**
 * "The Fall + velocity" choreography for the homepage problem section.
 *
 * Beats:
 *  - Eyebrow "THE PROBLEM" types on char-by-char (mono-tick ease).
 *  - Each kinetic line reveals word-by-word via clip-path wipe (settle ease).
 *  - Line 2's `middleman` word pulses briefly as it enters viewport.
 *  - Line 3's "a stranger too" chars fall from above with overshoot (fall
 *    ease, from:'random' stagger). The strikethrough (`.problem__struck`
 *    pseudo driven by `--strike-scale`) is scrubbed LTR over a short scroll
 *    segment (strike ease).
 *  - Scroll velocity drifts the red phrase down slightly via an Observer
 *    driving `--drift-y` through a `gsap.quickTo`, decaying back to 0.
 *  - The "The fix" answer reveals with rotateX perspective.
 *
 * The reduced-motion branch clears all inline tween state and forces
 * `--strike-scale: 1` + `--drift-y: 0` inline; the SCSS @media fallback
 * does the same at the CSS layer so pre-hydration paint is already legible.
 */
export function TheProblemAnimations({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const container = containerRef.current;

      registerProblemEases();
      try {
        gsap.registerPlugin(Observer);
      } catch {
        // Already registered (HMR-safe).
      }

      const mm = gsap.matchMedia();
      const splits: SplitText[] = [];
      let velocityObserver: Observer | null = null;
      let driftQuickTo: ReturnType<typeof gsap.quickTo> | null = null;
      let driftDecay: gsap.core.Tween | null = null;

      // SplitText's `aria: 'auto'` default adds `aria-label` to the split
      // target — axe flags that on <p> (role=paragraph prohibits aria-label)
      // and on <s>/<span> (no role). We strip the injected aria attributes
      // so the natural DOM text (visible chars/words) remains the
      // accessible name for screen readers.
      const stripSplitAria = (
        target: Element,
        pieces: Element[] | HTMLElement[] | readonly Element[] = [],
      ) => {
        target.removeAttribute('aria-label');
        for (const piece of pieces) {
          (piece as Element).removeAttribute('aria-hidden');
        }
      };

      mm.add(MATCH_MEDIA.noReducedMotion, () => {
        // ----- 1) Eyebrow chars type-on (mono-tick) ----------------------
        const eyebrow = container.querySelector<HTMLElement>(
          '[data-animate="eyebrow"]',
        );
        if (eyebrow) {
          const eyebrowSplit = SplitText.create(eyebrow, { type: 'chars' });
          splits.push(eyebrowSplit);
          stripSplitAria(eyebrow, eyebrowSplit.chars);
          gsap.from(eyebrowSplit.chars, {
            opacity: 0,
            x: -4,
            duration: 0.45,
            stagger: 0.018,
            ease: PROBLEM_EASE_NAMES.monoTick,
            scrollTrigger: {
              trigger: eyebrow,
              start: 'top 88%',
              once: true,
            },
          });
        }

        // ----- 2) Lines 1..4 word-level clip-wipe + settle --------------
        const lines = container.querySelectorAll<HTMLElement>(
          '[data-animate="line"]',
        );
        lines.forEach((line, idx) => {
          const split = SplitText.create(line, { type: 'words' });
          splits.push(split);
          stripSplitAria(line, split.words);
          gsap.from(split.words, {
            clipPath: 'inset(0 100% 0 0)',
            y: 10,
            duration: 0.9,
            stagger: 0.04,
            ease: PROBLEM_EASE_NAMES.settle,
            delay: idx * 0.12,
            scrollTrigger: {
              trigger: line,
              start: 'top 80%',
              once: true,
            },
          });
        });

        // ----- 3) Line 2 "middleman" emphasis pulse ---------------------
        const middleman = container.querySelector<HTMLElement>(
          '[data-animate="middleman-emphasis"]',
        );
        if (middleman) {
          gsap.fromTo(
            middleman,
            { scale: 1 },
            {
              scale: 1.06,
              duration: 0.35,
              yoyo: true,
              repeat: 1,
              ease: 'power2.inOut',
              transformOrigin: 'center',
              scrollTrigger: {
                trigger: middleman,
                start: 'top 72%',
                once: true,
              },
            },
          );
        }

        // ----- 4) "a stranger too" — CENTERPIECE ------------------------
        const strangerEl = container.querySelector<HTMLElement>(
          '[data-animate="stranger"]',
        );
        if (strangerEl) {
          // Nested SplitText: words preserve wrapping, chars drive the fall.
          const strangerSplit = SplitText.create(strangerEl, {
            type: 'words, chars',
          });
          splits.push(strangerSplit);
          stripSplitAria(strangerEl, [
            ...strangerSplit.words,
            ...strangerSplit.chars,
          ]);

          // Chars drop from above with overshoot, random stagger.
          gsap.from(strangerSplit.chars, {
            yPercent: -120,
            rotationX: -55,
            opacity: 0,
            duration: 0.85,
            stagger: { each: 0.035, from: 'random' },
            ease: PROBLEM_EASE_NAMES.fall,
            transformOrigin: '50% 100% -20',
            scrollTrigger: {
              trigger: strangerEl,
              start: 'top 75%',
              once: true,
            },
          });

          // Strikethrough scrubbed LTR via --strike-scale (GPU-smooth
          // thanks to @property <number> registration in the SCSS module).
          gsap.fromTo(
            strangerEl,
            { '--strike-scale': 0 },
            {
              '--strike-scale': 1,
              ease: PROBLEM_EASE_NAMES.strike,
              scrollTrigger: {
                trigger: strangerEl,
                start: 'top 70%',
                end: 'top 45%',
                scrub: 0.4,
                invalidateOnRefresh: true,
              },
            },
          );

          // Velocity drift: observe scroll, nudge --drift-y, decay back.
          driftQuickTo = gsap.quickTo(strangerEl, '--drift-y', {
            duration: 0.35,
            ease: 'power3.out',
          });

          velocityObserver = Observer.create({
            target: window,
            type: 'wheel,touch,scroll',
            onChangeY: (self) => {
              if (!driftQuickTo) return;
              const delta = Math.abs(self.deltaY ?? 0);
              const drift = gsap.utils.clamp(0, delta * 0.12, 24);
              driftQuickTo(drift);
              if (driftDecay) driftDecay.kill();
              driftDecay = gsap.delayedCall(0.22, () => {
                driftQuickTo?.(0);
              });
            },
            preventDefault: false,
          });
        }

        // ----- 5) "The fix" answer grid reveal --------------------------
        const fixParts = container.querySelectorAll<HTMLElement>(
          '[data-animate="fix"]',
        );
        if (fixParts.length) {
          gsap.from(fixParts, {
            y: 24,
            opacity: 0,
            rotationX: -8,
            transformOrigin: 'bottom',
            duration: 0.9,
            stagger: 0.12,
            ease: PROBLEM_EASE_NAMES.settle,
            scrollTrigger: {
              trigger: fixParts[0],
              start: 'top 85%',
              once: true,
            },
          });
        }

        // Refresh trigger measurements once custom fonts settle.
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          document.fonts.ready
            .then(() => ScrollTrigger.refresh())
            .catch(() => {});
        }
      });

      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(container.querySelectorAll('[data-animate]'), {
          clearProps: 'all',
        });
        const strangerEl = container.querySelector<HTMLElement>(
          '[data-animate="stranger"]',
        );
        if (strangerEl) {
          gsap.set(strangerEl, {
            '--strike-scale': 1,
            '--drift-y': 0,
          });
        }
      });

      return () => {
        splits.forEach((s) => s.revert());
        splits.length = 0;
        velocityObserver?.kill();
        velocityObserver = null;
        driftDecay?.kill();
        driftDecay = null;
        driftQuickTo = null;
      };
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
