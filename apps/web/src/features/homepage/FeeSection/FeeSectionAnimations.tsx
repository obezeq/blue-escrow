'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

/**
 * Client wrapper that adds GSAP animations to FeeSection.
 * Desktop+tablet: scrub scale on "0.33%", fade-in comparison.
 * Mobile: same scrub, simpler fade.
 * Reduced motion: all content visible, no animation.
 */
export function FeeSectionAnimations({
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

      // Desktop + tablet
      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          buildDesktopAnimations(container);
        },
      );

      // Mobile
      mm.add(
        '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        () => {
          buildMobileFallback(container);
        },
      );

      // Reduced motion: all visible
      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(container.querySelectorAll('[data-animate]'), {
          clearProps: 'all',
        });
      });
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Desktop + tablet
// ---------------------------------------------------------------------------

function buildDesktopAnimations(container: HTMLElement) {
  const feeNumber = container.querySelector('[data-animate="fee-number"]');
  const comparison = container.querySelector('[data-animate="comparison"]');

  // Massive number: scrub scale + opacity
  if (feeNumber) {
    gsap.fromTo(
      feeNumber,
      { scale: 1.5, opacity: 0.3 },
      {
        scale: 1,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: feeNumber,
          start: 'top 80%',
          end: 'top 30%',
          scrub: 1,
        },
      },
    );
  }

  // Comparison text fades in after number settles
  if (comparison) {
    gsap.from(comparison, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: comparison,
        start: 'top 60%',
        once: true,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Mobile
// ---------------------------------------------------------------------------

function buildMobileFallback(container: HTMLElement) {
  const feeNumber = container.querySelector('[data-animate="fee-number"]');
  const comparison = container.querySelector('[data-animate="comparison"]');

  // Number still scrubs but with adjusted range
  if (feeNumber) {
    gsap.fromTo(
      feeNumber,
      { scale: 1.3, opacity: 0.3 },
      {
        scale: 1,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: feeNumber,
          start: 'top 90%',
          end: 'top 50%',
          scrub: 1,
        },
      },
    );
  }

  // Comparison simple fade
  if (comparison) {
    gsap.from(comparison, {
      y: 40,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: comparison,
        start: 'top 80%',
        once: true,
      },
    });
  }
}
