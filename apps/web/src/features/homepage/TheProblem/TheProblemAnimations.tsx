'use client';

import { useRef } from 'react';
import {
  gsap,
  SplitText,
  useGSAP,
} from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { createPinnedTimeline } from '@/animations/scrollTrigger/pinnedSection';

// Timeline budget (normalized durations, sum ≈ 1.0)
const B = {
  wordReveal: 0.45,
  kineticOut: 0.05,
  verdictIn: 0.05,
  counter: 0.10,
  captionIn: 0.05,
  holdB: 0.10,
  holdC: 0.20,
};

/**
 * Client wrapper that adds GSAP scroll-pinned animations to TheProblem.
 * Desktop+tablet: pinned ~2x viewport with scrub timeline.
 * Mobile: simple scroll reveals.
 * Reduced motion: all text visible, no animation.
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
      const mm = gsap.matchMedia();

      // Desktop + tablet: pinned timeline
      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          buildPinnedTimeline(container);
        },
      );

      // Mobile: simple scroll reveals
      mm.add(
        '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        () => {
          buildMobileFallback(container);
        },
      );

      // Reduced motion: all visible, no animation
      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(container.querySelectorAll('[data-phase]'), {
          clearProps: 'all',
        });
      });
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Desktop + tablet: pinned scroll-driven timeline
// ---------------------------------------------------------------------------

function buildPinnedTimeline(container: HTMLElement) {
  const section = container.closest('section');
  if (!section) return;

  const kineticPhase = container.querySelector('[data-phase="kinetic"]');
  const impactPhase = container.querySelector('[data-phase="impact"]');
  const h2 = container.querySelector('h2');
  const verdictEl = container.querySelector(
    '[data-animate="verdict"]',
  ) as HTMLElement | null;
  const counterEl = container.querySelector(
    '[data-animate="counter"]',
  ) as HTMLElement | null;
  const captionEl = container.querySelector(
    '[data-animate="caption"]',
  ) as HTMLElement | null;

  if (!h2 || !kineticPhase || !impactPhase) return;

  // Hide impact phase before timeline starts (progressive enhancement:
  // without JS, CSS keeps it visible)
  gsap.set(impactPhase, { opacity: 0 });

  // SplitText on h2 — called before any layout changes
  const split = SplitText.create(h2, { type: 'words', autoSplit: true });

  // Create pinned timeline
  const tl = createPinnedTimeline({
    trigger: section,
    endOffset: '+=200vh',
    scrub: 1,
  });

  // Phase A (0-45%): kinetic text — words reveal one-by-one synced to scroll
  tl.from(split.words, {
    y: 40,
    opacity: 0,
    stagger: 0.03,
    duration: B.wordReveal,
    ease: 'power3.out',
  });

  // Phase A→B (45-50%): kinetic text fades out
  tl.to(kineticPhase, {
    opacity: 0,
    y: -30,
    duration: B.kineticOut,
    ease: 'power2.in',
  });

  // Phase B (50-55%): verdict fades in
  tl.to(impactPhase, {
    opacity: 1,
    duration: 0.01,
  });

  if (verdictEl) {
    tl.from(verdictEl, {
      opacity: 0,
      y: 40,
      duration: B.verdictIn,
      ease: 'power3.out',
    });
  }

  // Phase B (55-65%): counter $0 → $2.1B
  if (counterEl) {
    counterEl.textContent = '$0.0B';
    const proxy = { value: 0 };

    tl.to(proxy, {
      value: 2.1,
      duration: B.counter,
      ease: 'power2.out',
      onUpdate() {
        counterEl.textContent = `$${proxy.value.toFixed(1)}B`;
      },
    });
  }

  // Phase B (65-70%): caption fades in
  if (captionEl) {
    tl.from(captionEl, {
      opacity: 0,
      y: 20,
      duration: B.captionIn,
      ease: 'power3.out',
    });
  }

  // Phase B hold (70-80%): breathing room
  tl.to({}, { duration: B.holdB });

  // Phase C hold (80-100%): pause before TheSolution
  tl.to({}, { duration: B.holdC });
}

// ---------------------------------------------------------------------------
// Mobile: simple scroll reveals (no pin)
// ---------------------------------------------------------------------------

function buildMobileFallback(container: HTMLElement) {
  const phases = container.querySelectorAll('[data-phase]');

  phases.forEach((phase) => {
    gsap.from(phase, {
      y: 60,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: phase,
        start: 'top 80%',
        once: true,
      },
    });
  });

  // Counter still animates on viewport entry
  const counterEl = container.querySelector(
    '[data-animate="counter"]',
  ) as HTMLElement | null;

  if (counterEl) {
    const proxy = { value: 0 };

    gsap.to(proxy, {
      value: 2.1,
      duration: 2,
      ease: 'power2.out',
      onUpdate() {
        counterEl.textContent = `$${proxy.value.toFixed(1)}B`;
      },
      scrollTrigger: {
        trigger: counterEl,
        start: 'top 80%',
        once: true,
      },
    });
  }
}
