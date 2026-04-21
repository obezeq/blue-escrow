'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import lineStyles from './TheProblem.module.scss';

const STRUCK_CLASS = lineStyles['problem__line--struck'] ?? 'problem__line--struck';

/**
 * Scroll-in reveal for the v6 problem statement.
 * - Eyebrow fades up first
 * - Each kinetic line fades up with slight stagger
 * - When the line containing `.problem__red` enters, add a modifier
 *   class so the strikethrough scales out (CSS-driven)
 * - The "The fix" answer grid reveals as a staggered group once it
 *   enters the viewport
 *
 * Reduced motion skips every animation; the strikethrough is forced on
 * via CSS (@media prefers-reduced-motion) so the visual contrast lands.
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

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const eyebrow = container.querySelector('[data-animate="eyebrow"]');
        const lines = container.querySelectorAll('[data-animate="line"]');
        const fixParts = container.querySelectorAll('[data-animate="fix"]');

        if (eyebrow) {
          gsap.from(eyebrow, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: eyebrow, start: 'top 85%', once: true },
          });
        }

        lines.forEach((line, i) => {
          gsap.from(line, {
            y: 40,
            opacity: 0,
            duration: 0.9,
            delay: i * 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: line,
              start: 'top 80%',
              once: true,
              onEnter() {
                line.classList.add(STRUCK_CLASS);
              },
            },
          });
        });

        if (fixParts.length) {
          gsap.from(fixParts, {
            y: 24,
            opacity: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: fixParts[0],
              start: 'top 85%',
              once: true,
            },
          });
        }
      });

      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(container.querySelectorAll('[data-animate]'), {
          clearProps: 'all',
        });
        container
          .querySelectorAll('[data-animate="line"]')
          .forEach((line) => line.classList.add(STRUCK_CLASS));
      });
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
