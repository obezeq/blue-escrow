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
  headingReveal: 0.10,
  headingHold: 0.05,
  buyerIn: 0.03,
  buyerLines: 0.15,
  buyerHold: 0.04,
  crossFade: 0.03,
  sellerLines: 0.15,
  sellerHold: 0.04,
  middlemanLines: 0.12,
  middlemanHold: 0.04,
  closingTransition: 0.05,
  closingReveal: 0.07,
  closingHold: 0.13,
};

/**
 * Client wrapper that adds GSAP scroll-pinned animations to TheSolution.
 * Desktop+tablet: pinned ~2.5x viewport with scrub timeline.
 * Mobile: simple scroll reveals (no pin).
 * Reduced motion: all text visible, no animation.
 */
export function TheSolutionAnimations({
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
        gsap.set(
          container.querySelectorAll(
            '[data-phase], [data-persist], [data-region]',
          ),
          { clearProps: 'all' },
        );
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

  const heading = container.querySelector(
    '[data-persist="heading"]',
  ) as HTMLElement | null;
  const locksRegion = container.querySelector(
    '[data-region="locks"]',
  ) as HTMLElement | null;
  const buyerPhase = container.querySelector(
    '[data-phase="buyer"]',
  ) as HTMLElement | null;
  const sellerPhase = container.querySelector(
    '[data-phase="seller"]',
  ) as HTMLElement | null;
  const middlemanPhase = container.querySelector(
    '[data-phase="middleman"]',
  ) as HTMLElement | null;
  const closingPhase = container.querySelector(
    '[data-phase="closing"]',
  ) as HTMLElement | null;

  if (!heading || !locksRegion || !buyerPhase || !sellerPhase || !middlemanPhase || !closingPhase) return;

  // SplitText on heading BEFORE any layout changes
  const headingSplit = SplitText.create(heading, {
    type: 'words',
    autoSplit: true,
  });

  // Position lock phases absolutely for cross-fading
  const lockPhases = locksRegion.querySelectorAll('[data-phase]');
  gsap.set(lockPhases, {
    position: 'absolute',
    top: 0,
    left: '50%',
    xPercent: -50,
    width: '100%',
  });

  // Hide everything except heading initially
  gsap.set([...lockPhases, closingPhase], { opacity: 0 });

  // Create pinned timeline
  const tl = createPinnedTimeline({
    trigger: section,
    endOffset: '+=250vh',
    scrub: 1,
  });

  // --- Phase A (0-15%): heading word stagger ---
  tl.from(headingSplit.words, {
    y: 40,
    opacity: 0,
    stagger: 0.04,
    duration: B.headingReveal,
    ease: 'power3.out',
  });
  tl.to({}, { duration: B.headingHold });

  // --- Phase B (15-40%): buyer lock ---
  tl.to(buyerPhase, { opacity: 1, duration: B.buyerIn });

  const buyerLines = buyerPhase.querySelectorAll('[data-animate="text"]');
  if (buyerLines.length) {
    tl.from(
      buyerLines,
      {
        y: 30,
        opacity: 0,
        stagger: 0.05,
        duration: B.buyerLines,
        ease: 'power3.out',
      },
      '<+=0.01',
    );
  }
  tl.to({}, { duration: B.buyerHold });

  // --- Phase B→C cross-fade (37-40%): buyer out, seller in ---
  tl.to(buyerPhase, { opacity: 0, duration: B.crossFade });
  tl.to(sellerPhase, { opacity: 1, duration: B.crossFade }, '<');

  // --- Phase C (40-59%): seller lock ---
  const sellerLines = sellerPhase.querySelectorAll(
    '[data-animate="text"]',
  );
  if (sellerLines.length) {
    tl.from(sellerLines, {
      y: 30,
      opacity: 0,
      stagger: 0.05,
      duration: B.sellerLines,
      ease: 'power3.out',
    });
  }
  tl.to({}, { duration: B.sellerHold });

  // --- Phase C→D cross-fade (59-62%): seller out, middleman in ---
  tl.to(sellerPhase, { opacity: 0, duration: B.crossFade });
  tl.to(middlemanPhase, { opacity: 1, duration: B.crossFade }, '<');

  // --- Phase D (62-78%): middleman lock ---
  const middlemanLines = middlemanPhase.querySelectorAll(
    '[data-animate="text"]',
  );
  if (middlemanLines.length) {
    tl.from(middlemanLines, {
      y: 30,
      opacity: 0,
      stagger: 0.05,
      duration: B.middlemanLines,
      ease: 'power3.out',
    });
  }
  tl.to({}, { duration: B.middlemanHold });

  // --- Phase D→E (78-83%): heading + middleman out, closing in ---
  tl.to(heading, { opacity: 0, y: -20, duration: B.closingTransition });
  tl.to(middlemanPhase, { opacity: 0, duration: B.closingTransition }, '<');
  tl.to(locksRegion, { opacity: 0, duration: B.closingTransition }, '<');

  // --- Phase E (83-100%): closing ---
  tl.to(closingPhase, { opacity: 1, duration: 0.02 });
  tl.from(closingPhase.querySelector('[data-animate="closing"]'), {
    opacity: 0,
    y: 20,
    scale: 0.95,
    duration: B.closingReveal,
    ease: 'power3.out',
  });
  tl.to({}, { duration: B.closingHold });
}

// ---------------------------------------------------------------------------
// Mobile: simple scroll reveals (no pin)
// ---------------------------------------------------------------------------

function buildMobileFallback(container: HTMLElement) {
  // Heading reveal
  const heading = container.querySelector('[data-persist="heading"]');
  if (heading) {
    gsap.from(heading, {
      y: 60,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: heading,
        start: 'top 80%',
        once: true,
      },
    });
  }

  // Each phase reveals on scroll
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
}
