'use client';

import { useRef } from 'react';
import { gsap, SplitText, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import lineStyles from './TheProblem.module.scss';

const STRUCK_CLASS = lineStyles['problem__line--struck'] ?? 'problem__line--struck';

/**
 * Scroll-in reveal for the v6 problem statement.
 * - Eyebrow fades up first
 * - Each kinetic line reveals word-by-word via a clip-path wipe that
 *   uncovers words left-to-right. Words come from `SplitText` (type:
 *   'words') so they inherit the line's typography and layout — no
 *   manual span wrapping required.
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
      // Captured so cleanup can revert SplitText DOM mutations on unmount.
      // Each line gets its own split so we keep a flat array and revert
      // them all in order.
      const splits: SplitText[] = [];

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const eyebrow = container.querySelector('[data-animate="eyebrow"]');
        const lines = container.querySelectorAll<HTMLElement>(
          '[data-animate="line"]',
        );
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

        lines.forEach((line, lineIndex) => {
          // Split each line into words — clip-path animates on spans so
          // SplitText words (which are inline-block wrappers) are the
          // correct targets. We do NOT split into chars here: word-level
          // is the right grain for a clip-wipe (chars look like TV static).
          const split = SplitText.create(line, { type: 'words' });
          splits.push(split);

          gsap.from(split.words, {
            clipPath: 'inset(0 100% 0 0)',
            duration: 0.8,
            stagger: 0.04,
            ease: 'power3.out',
            // Keep the previous cascade across lines: each line starts
            // 0.15s after the previous trigger. Since each line has its
            // own ScrollTrigger (with `once: true`), the per-line delay
            // sequences the reveal when the whole block enters together.
            delay: lineIndex * 0.15,
            scrollTrigger: {
              trigger: line,
              start: 'top 80%',
              once: true,
              onEnter() {
                // Keep the strikethrough trigger intact (CSS scales the
                // red line out when this class lands).
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

      return () => {
        // Undo SplitText's span wrapping so remounts (strict-mode, HMR,
        // route re-entry) don't stack duplicate word spans on each line.
        splits.forEach((s) => s.revert());
        splits.length = 0;
      };
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
