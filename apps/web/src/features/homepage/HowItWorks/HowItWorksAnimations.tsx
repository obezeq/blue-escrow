'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { createPinnedTimeline } from '@/animations/scrollTrigger/pinnedSection';

// Timeline budget (normalized durations, sum ≈ 1.0)
const B = {
  headingIn: 0.05,
  headingHold: 0.03,
  scroll: 0.82,
  holdEnd: 0.10,
};

/**
 * Client wrapper that adds GSAP horizontal-scroll animation to HowItWorks.
 * Desktop+tablet: pinned ~5x viewport, cards slide via xPercent.
 * Mobile: simple scroll reveals (no pin).
 * Reduced motion: all cards visible, no animation.
 */
export function HowItWorksAnimations({
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

      // Desktop + tablet: pinned horizontal scroll
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
          container.querySelectorAll('[data-step], [data-animate]'),
          { clearProps: 'all' },
        );
      });
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Desktop + tablet: pinned horizontal scroll
// ---------------------------------------------------------------------------

function buildPinnedTimeline(container: HTMLElement) {
  const section = container.closest('section');
  if (!section) return;

  const heading = container.querySelector(
    '[data-animate="heading"]',
  ) as HTMLElement | null;
  const list = container.querySelector(
    '[data-animate="list"]',
  ) as HTMLElement | null;

  if (!heading || !list) return;

  const tl = createPinnedTimeline({
    trigger: section,
    endOffset: '+=500vh',
    scrub: 1,
  });

  // Heading reveal
  tl.from(heading, {
    y: 40,
    opacity: 0,
    duration: B.headingIn,
    ease: 'power3.out',
  });
  tl.to({}, { duration: B.headingHold });

  // Horizontal scroll: 500% wide list shifts left by 80% (4 cards worth)
  tl.to(list, {
    xPercent: -80,
    duration: B.scroll,
    ease: 'none',
  });

  // Hold at end
  tl.to({}, { duration: B.holdEnd });
}

// ---------------------------------------------------------------------------
// Mobile: simple scroll reveals (no pin)
// ---------------------------------------------------------------------------

function buildMobileFallback(container: HTMLElement) {
  const heading = container.querySelector('[data-animate="heading"]');
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

  const cards = container.querySelectorAll('[data-step]');
  cards.forEach((card) => {
    gsap.from(card, {
      y: 60,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 80%',
        once: true,
      },
    });
  });
}
