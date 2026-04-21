'use client';

import { useRef, type RefObject } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

interface HowItWorksAnimationsProps {
  children: React.ReactNode;
  stageRef: RefObject<HTMLDivElement | null>;
  onPhaseChange: (phase: 0 | 1 | 2 | 3 | 4) => void;
}

/**
 * Head reveals + scroll-driven phase dispatch for HowItWorks.
 *
 * - Eyebrow + heading + subtitle stagger in at the top of the section
 * - While the stage is in view, scroll progress through it is binned
 *   into 5 phases that drive the parent component's active step. The
 *   rail + narration + ledger then update purely via React state.
 *
 * Heavy pinned choreography with wires, actors orbiting and money
 * packets is intentionally deferred to Phase 3; this is enough for the
 * v6 copy + structure to read correctly.
 */
export function HowItWorksAnimations({
  children,
  stageRef,
  onPhaseChange,
}: HowItWorksAnimationsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPhaseRef = useRef<number>(0);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const eyebrow = container.querySelector('[data-animate="eyebrow"]');
        const heading = container.querySelector('[data-animate="heading"]');
        const subtitle = container.querySelector('[data-animate="subtitle"]');

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

        if (!stageRef.current) return;

        const trigger = ScrollTrigger.create({
          trigger: stageRef.current,
          start: 'top 70%',
          end: 'bottom 30%',
          onUpdate(self) {
            const phase = Math.min(4, Math.floor(self.progress * 5));
            if (phase !== lastPhaseRef.current) {
              lastPhaseRef.current = phase;
              onPhaseChange(phase as 0 | 1 | 2 | 3 | 4);
            }
          },
        });

        return () => trigger.kill();
      });

      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(container.querySelectorAll('[data-animate]'), {
          clearProps: 'all',
        });
      });
    },
    { scope: containerRef, dependencies: [onPhaseChange, stageRef] },
  );

  return <div ref={containerRef}>{children}</div>;
}
