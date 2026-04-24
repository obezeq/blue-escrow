'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { useCardTilt } from './useCardTilt';

/**
 * Scroll-in reveal + mouse-tilt for the v6 Receipts cards.
 * - Head block (eyebrow + heading + subtitle) staggers in
 * - Each card enters with a 60px y lift + opacity
 * - useCardTilt attaches mouse-tracking rotateX/Y on desktop only
 */
export function ReceiptsAnimations({
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

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const eyebrow = container.querySelector('[data-animate="eyebrow"]');
        const heading = container.querySelector('[data-animate="heading"]');
        const subtitle = container.querySelector('[data-animate="subtitle"]');
        const cards = container.querySelectorAll('[data-animate="card"]');

        if (eyebrow) {
          gsap.from(eyebrow, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: eyebrow, start: 'top 85%', once: true },
          });
        }
        if (heading) {
          gsap.from(heading, {
            y: 30,
            opacity: 0,
            duration: 0.9,
            delay: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: heading, start: 'top 85%', once: true },
          });
        }
        if (subtitle) {
          gsap.from(subtitle, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            delay: 0.2,
            ease: 'power3.out',
            scrollTrigger: { trigger: subtitle, start: 'top 85%', once: true },
          });
        }

        if (cards.length) {
          gsap.from(cards, {
            y: 60,
            opacity: 0,
            duration: 1,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: { trigger: cards[0], start: 'top 85%', once: true },
          });
        }

        // Idle rotation — soul card outer dashed ring. 60s/rev at ease:'none'
        // keeps it barely perceptible; useGSAP scope auto-kills on unmount.
        const soulRing = container.querySelector('[data-animate="soul-ring"]');
        if (soulRing) {
          gsap.to(soulRing, {
            rotation: 360,
            transformOrigin: '100px 100px', // SoulVisual viewBox center
            duration: 60,
            repeat: -1,
            ease: 'none',
          });
        }

        // Holographic shimmer — drives --halo-angle on the soul card; the
        // conic-gradient rendered by @mixin holographic-edge consumes it.
        // 12s rotation cycle — noticeable but never distracting.
        // `cards[0]` is the soul card (first in RECEIPTS_CARDS).
        if (cards.length > 0 && cards[0]) {
          gsap.to(cards[0], {
            '--halo-angle': '360deg',
            duration: 12,
            repeat: -1,
            ease: 'none',
          });
        }
      });

      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(container.querySelectorAll('[data-animate]'), {
          clearProps: 'all',
        });
      });
    },
    { scope: containerRef },
  );

  // Mouse tilt binds to the same ref scope. The hook internally skips
  // on touch-primary and reduced-motion users.
  useCardTilt(containerRef, '[data-animate="card"]');

  return <div ref={containerRef}>{children}</div>;
}
