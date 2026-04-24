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
import { SCRUB_DEFAULTS_SAFE, scheduleRefresh } from '@/animations/config/motion-system';
import { registerProblemEases, PROBLEM_EASE_NAMES } from './problem-eases';

/**
 * "The Fall + velocity" choreography for the homepage problem section.
 *
 * Beats:
 *  - Eyebrow "THE PROBLEM" types on char-by-char (mono-tick ease).
 *  - Each kinetic line reveals word-by-word via clip-path wipe (settle ease).
 *  - Line 2's `middleman` word pulses briefly as it enters viewport.
 *  - Line 3's "a stranger too" — CENTERPIECE. On desktop >=900px × >=700px
 *    a scrubbed ScrollTrigger pins the [data-stage="line-3"] wrapper and a
 *    master timeline sequences CURTAIN → FALL → STRIKE → SETTLE over ~140vh
 *    of virtual scroll, so each beat reads in order (no overlap). On mobile
 *    the three animations run as independent ScrollTriggers like the rest
 *    of the section. Mirrors the pinned-stage pattern in
 *    HowItWorksAnimations.tsx:572–612.
 *  - Scroll velocity drifts the red phrase down slightly via an Observer
 *    driving `--drift-y` through a `gsap.quickTo`, decaying back to 0.
 *  - The "The fix" answer reveals with rotateX perspective.
 *
 * The reduced-motion branch clears all inline tween state, sets the SVG
 * path's stroke-dashoffset to 0 (fully drawn) and parks --drift-y at 0px.
 * NO pin, NO master timeline under reduced-motion. The SCSS @media fallback
 * also forces stroke-dashoffset: 0 at the CSS layer so pre-hydration paint
 * is already legible.
 */
const MEDIA_LINE3_PIN =
  '(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)';
const MEDIA_LINE3_MOBILE =
  '(max-width: 899px) and (prefers-reduced-motion: no-preference)';

const MASTER_LABELS = [
  'stage-curtain',
  'stage-fall',
  'stage-strike',
  'stage-settle',
] as const;

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
      // Pin branch handles (desktop only). Declared in outer scope so the
      // cleanup below can tear them down on unmount.
      let problemStage: ScrollTrigger | null = null;
      let problemMasterTl: gsap.core.Timeline | null = null;
      let orientationMql: MediaQueryList | null = null;
      let onOrientation: (() => void) | null = null;
      let themeObserver: MutationObserver | null = null;

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

      // ========================================================================
      // Common noReducedMotion branch (matches on every breakpoint).
      //   Beats 1, 2 (SKIPS line 3), 3, 4c (drift Observer), 5 live here.
      //   Beat 4a + 4b (line-3 curtain + fall + strike) are delegated to the
      //   breakpoint-specific branches below (MEDIA_LINE3_MOBILE | PIN).
      // ========================================================================
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
        // Line 3 is the pinned CENTERPIECE on desktop; it belongs to the
        // master timeline authored in the MEDIA_LINE3_PIN branch. We skip
        // it here so its words aren't double-split / double-tweened. On
        // mobile, the MEDIA_LINE3_MOBILE branch handles line 3 explicitly
        // with its own independent ScrollTriggers (no pin).
        const lines = container.querySelectorAll<HTMLElement>(
          '[data-animate="line"]',
        );
        lines.forEach((line, idx) => {
          if (line.closest('[data-stage="line-3"]')) return;
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

        // ----- 4c) Velocity drift Observer (orthogonal, breakpoint-agnostic)
        const strangerEl = container.querySelector<HTMLElement>(
          '[data-animate="stranger"]',
        );
        if (strangerEl) {
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
      });

      // ========================================================================
      // Mobile fallback for line 3 (<900px OR <700px tall).
      //   Three independent ScrollTriggers — identical to the pre-pin behavior,
      //   kept for short viewports where pinning a hero line feels broken.
      // ========================================================================
      mm.add(MEDIA_LINE3_MOBILE, () => {
        const stageLine = container.querySelector<HTMLElement>(
          '[data-stage="line-3"] [data-animate="line"]',
        );
        const strangerEl = container.querySelector<HTMLElement>(
          '[data-animate="stranger"]',
        );
        if (!stageLine || !strangerEl) return;

        // Line 3 curtain wipe (words).
        const lineSplit = SplitText.create(stageLine, { type: 'words' });
        splits.push(lineSplit);
        stripSplitAria(stageLine, lineSplit.words);
        gsap.from(lineSplit.words, {
          clipPath: 'inset(0 100% 0 0)',
          y: 10,
          duration: 0.9,
          stagger: 0.04,
          ease: PROBLEM_EASE_NAMES.settle,
          delay: 0.24, // matches idx*0.12 for idx=2 in the original forEach
          scrollTrigger: {
            trigger: stageLine,
            start: 'top 80%',
            once: true,
          },
        });

        // "a stranger too" fall + strike (independent triggers).
        const strangerSplit = SplitText.create(strangerEl, {
          type: 'words, chars',
        });
        splits.push(strangerSplit);
        stripSplitAria(strangerEl, [
          ...strangerSplit.words,
          ...strangerSplit.chars,
        ]);

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

        const strangerPath = strangerEl.querySelector<SVGPathElement>(
          '.problem__strike path, svg path',
        );
        if (strangerPath) {
          gsap.set(strangerPath, { strokeDasharray: 100 });
          gsap.fromTo(
            strangerPath,
            { strokeDashoffset: 100 },
            {
              strokeDashoffset: 0,
              ease: PROBLEM_EASE_NAMES.strike,
              scrollTrigger: {
                trigger: strangerEl,
                start: 'top 85%',
                end: 'center 25%',
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            },
          );
        }
      });

      // ========================================================================
      // Desktop pin (>=900px × >=700px × no reduced-motion).
      //   Pins the line-3 stage and scrubs a master timeline through four
      //   labeled beats: curtain → fall → strike → settle. Scroll drives
      //   progress with `scrub: 0.6`; `snap: { snapTo: labelProgresses }`
      //   gives crisp segment boundaries. Bidirectional by nature of scrub.
      //
      //   Mirrors the HowItWorks pinned-stage pattern at
      //   HowItWorksAnimations.tsx:572–612.
      // ========================================================================
      mm.add(MEDIA_LINE3_PIN, () => {
        const stageWrap = container.querySelector<HTMLElement>(
          '[data-stage="line-3"]',
        );
        const stageLine = stageWrap?.querySelector<HTMLElement>(
          '[data-animate="line"]',
        );
        const strangerEl = stageWrap?.querySelector<HTMLElement>(
          '[data-animate="stranger"]',
        );
        if (!stageWrap || !stageLine || !strangerEl) return;

        const strangerPath = strangerEl.querySelector<SVGPathElement>(
          '.problem__strike path, svg path',
        );

        // --- SplitText for the master timeline ---------------------------
        const lineSplit = SplitText.create(stageLine, { type: 'words' });
        splits.push(lineSplit);
        stripSplitAria(stageLine, lineSplit.words);

        const strangerSplit = SplitText.create(strangerEl, {
          type: 'words, chars',
        });
        splits.push(strangerSplit);
        stripSplitAria(strangerEl, [
          ...strangerSplit.words,
          ...strangerSplit.chars,
        ]);

        // --- Seeds: what the user sees BEFORE the pin engages ------------
        // Using .to() (not .from()) inside the master timeline means we must
        // explicitly set the pre-timeline state via gsap.set, otherwise a
        // quick pre-hydration paint could flash the final state.
        gsap.set(lineSplit.words, {
          clipPath: 'inset(0 100% 0 0)',
          y: 10,
        });
        gsap.set(strangerSplit.chars, {
          yPercent: -120,
          rotationX: -55,
          opacity: 0,
          transformOrigin: '50% 100% -20',
        });
        if (strangerPath) {
          gsap.set(strangerPath, {
            strokeDasharray: 100,
            strokeDashoffset: 100,
          });
        }

        // --- Master timeline (paused; ST drives progress via `animation`)
        const masterTl = gsap.timeline({
          paused: true,
          defaults: { ease: 'power2.inOut' },
        });

        masterTl.addLabel('stage-curtain');
        masterTl.to(
          lineSplit.words,
          {
            clipPath: 'inset(0 0% 0 0)',
            y: 0,
            duration: 0.9,
            stagger: 0.04,
            ease: PROBLEM_EASE_NAMES.settle,
          },
          'stage-curtain',
        );

        // Tiny overlap at the tail of the curtain for cinematic continuity.
        masterTl.addLabel('stage-fall', '>-0.1');
        masterTl.to(
          strangerSplit.chars,
          {
            yPercent: 0,
            rotationX: 0,
            opacity: 1,
            duration: 0.85,
            stagger: { each: 0.035, from: 'random' },
            ease: PROBLEM_EASE_NAMES.fall,
          },
          'stage-fall',
        );

        // Small gap so chars land BEFORE the pen-stroke starts drawing —
        // this is the fix for the original overlap bug.
        masterTl.addLabel('stage-strike', '>+0.05');
        if (strangerPath) {
          masterTl.to(
            strangerPath,
            {
              strokeDashoffset: 0,
              duration: 0.8,
              ease: PROBLEM_EASE_NAMES.strike,
            },
            'stage-strike',
          );
        }

        // Tail pad so snap can settle on the last label without overshoot.
        masterTl.addLabel('stage-settle', '>');
        masterTl.to({}, { duration: 0.18 });

        // --- Compute labelProgresses (AFTER authoring, re-run on refresh) -
        let labelProgresses: number[] = MASTER_LABELS.map((name) => {
          const t = masterTl.labels[name];
          const dur = masterTl.duration();
          return dur > 0 && typeof t === 'number' ? t / dur : 0;
        });

        // --- Attach ScrollTrigger with pin + scrub + snap -----------------
        // `scrub: 0.6` matches the original strikethrough feel; lower would
        // make the pen-stroke race ahead of the wheel. `pinType: 'transform'`
        // is non-negotiable under Lenis — `pinType: 'fixed'` would stack
        // position: fixed on the pinned element and jitter against Lenis's
        // own root transform.
        const st = ScrollTrigger.create({
          id: 'problem-stage',
          trigger: stageWrap,
          start: () =>
            `top center-=${Math.round(stageWrap.offsetHeight / 2)}px`,
          end: () => '+=' + Math.round(window.innerHeight * 1.4),
          pin: true,
          pinType: 'transform',
          pinSpacing: true,
          scrub: 0.6,
          ...SCRUB_DEFAULTS_SAFE,
          animation: masterTl,
          snap: {
            snapTo: labelProgresses,
            duration: { min: 0.2, max: 0.6 },
            delay: 0.05,
            ease: 'power2.inOut',
            directional: false,
          },
          onRefresh() {
            labelProgresses = MASTER_LABELS.map((name) => {
              const t = masterTl.labels[name];
              const dur = masterTl.duration();
              return dur > 0 && typeof t === 'number' ? t / dur : 0;
            });
          },
        });

        problemStage = st;
        problemMasterTl = masterTl;

        // --- Dev-only: expose ST bounds + progress for e2e ----------------
        // Mirrors the __hiwStageTrigger harness at
        // HowItWorksAnimations.tsx:633–662. Stripped in production builds.
        if (process.env.NODE_ENV !== 'production') {
          (
            window as unknown as {
              __problemStageTrigger?: {
                start: number;
                end: number;
                pinned: () => boolean;
                progress: () => number;
                labelProgresses: () => number[];
              };
            }
          ).__problemStageTrigger = {
            get start() {
              return st.start;
            },
            get end() {
              return st.end;
            },
            pinned: () => st.isActive,
            progress: () => st.progress,
            labelProgresses: () => labelProgresses.slice(),
          };
        }
      });

      // ========================================================================
      // Reduced-motion: NO pin, NO master timeline. Snap everything to final.
      // ========================================================================
      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(container.querySelectorAll('[data-animate]'), {
          clearProps: 'all',
        });
        const strangerEl = container.querySelector<HTMLElement>(
          '[data-animate="stranger"]',
        );
        if (strangerEl) {
          gsap.set(strangerEl, { '--drift-y': 0 });
          const path = strangerEl.querySelector<SVGPathElement>(
            '.problem__strike path, svg path',
          );
          if (path) {
            gsap.set(path, { strokeDasharray: 100, strokeDashoffset: 0 });
          }
        }
      });

      // ------------------------------------------------------------------
      // Refresh triggers: re-measure after fonts settle, on orientation
      // flip, and on theme toggle (padding/shadow deltas can nudge anchors
      // by ~1px). Debounced to collapse refresh storms.
      // ------------------------------------------------------------------
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        document.fonts.ready.then(() => scheduleRefresh(200)).catch(() => {});
      }
      if (typeof window !== 'undefined') {
        orientationMql = window.matchMedia('(orientation: portrait)');
        onOrientation = () => scheduleRefresh(200);
        orientationMql.addEventListener('change', onOrientation);
      }
      if (typeof document !== 'undefined') {
        themeObserver = new MutationObserver(() => scheduleRefresh(200));
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });
      }

      return () => {
        splits.forEach((s) => s.revert());
        splits.length = 0;
        velocityObserver?.kill();
        velocityObserver = null;
        driftDecay?.kill();
        driftDecay = null;
        driftQuickTo = null;
        problemStage?.kill();
        problemStage = null;
        problemMasterTl?.kill();
        problemMasterTl = null;
        if (orientationMql && onOrientation) {
          orientationMql.removeEventListener('change', onOrientation);
        }
        orientationMql = null;
        onOrientation = null;
        themeObserver?.disconnect();
        themeObserver = null;
        // Belt-and-suspenders: matchMedia.revert() kills every ST + tween
        // authored inside mm.add branches (including the pin + master tl).
        mm.revert();
        if (process.env.NODE_ENV !== 'production') {
          delete (
            window as unknown as { __problemStageTrigger?: unknown }
          ).__problemStageTrigger;
        }
      };
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
