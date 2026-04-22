'use client';

import { useRef } from 'react';
import { gsap, SplitText, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

export function CtaSectionAnimations({
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
      // Captured so the cleanup path can `revert()` the SplitText DOM
      // wrapping on unmount. Without this, React remount / HMR / route
      // re-entry would stack duplicate <div>-per-word spans on the
      // heading. `onSplit` replaces the value when SplitText re-splits
      // under `autoSplit: true`.
      let split: SplitText | null = null;

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const eyebrow = container.querySelector('[data-animate="eyebrow"]');
        const heading = container.querySelector('[data-animate="heading"]');
        const ctas = container.querySelector('[data-animate="ctas"]');

        if (eyebrow) {
          gsap.from(eyebrow, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: eyebrow,
              start: 'top 85%',
              once: true,
            },
          });
        }

        if (heading) {
          split = SplitText.create(heading, {
            type: 'words',
            autoSplit: true,
            onSplit(self) {
              // `autoSplit: true` recreates splits on container resize; keep
              // the outer capture up-to-date so cleanup reverts the latest.
              split = self;
              return gsap.from(self.words, {
                yPercent: 110,
                opacity: 0,
                duration: 1,
                ease: 'power4.out',
                stagger: 0.06,
                scrollTrigger: {
                  trigger: heading,
                  start: 'top 70%',
                  once: true,
                },
              });
            },
          });
        }

        if (ctas) {
          gsap.from(Array.from(ctas.children), {
            y: 20,
            opacity: 0,
            duration: 0.6,
            ease: 'power3.out',
            stagger: 0.12,
            scrollTrigger: {
              trigger: ctas,
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
      });

      // Explicit revert on unmount — useGSAP's context auto-kills tweens
      // but does NOT undo DOM mutations from SplitText. Reverting
      // restores the original text node so a re-mount (React strict-mode,
      // HMR, route re-entry) doesn't stack another layer of word spans.
      return () => {
        if (split) {
          split.revert();
          split = null;
        }
      };
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
