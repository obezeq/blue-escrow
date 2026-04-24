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

        // fromTo with immediateRender:true (mirrors HeroAnimations.tsx
        // docstring at lines 90-100): explicit FROM and TO decouples the
        // tween from whatever the element's computed opacity is at
        // tween-creation time. gsap.from() would capture "current" as the
        // TO value — if any CSS rule or parent compositing drops the
        // element to opacity:0 during preloader, the tween ends up
        // animating 0→0 (no-op) and the element stays invisible.
        if (eyebrow) {
          gsap.fromTo(
            eyebrow,
            { y: 20, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              ease: 'power3.out',
              immediateRender: true,
              scrollTrigger: {
                trigger: eyebrow,
                start: 'top 85%',
                once: true,
              },
            },
          );
        }

        if (heading) {
          split = SplitText.create(heading, {
            type: 'words',
            autoSplit: true,
            onSplit(self) {
              // `autoSplit: true` recreates splits on container resize; keep
              // the outer capture up-to-date so cleanup reverts the latest.
              split = self;
              return gsap.fromTo(
                self.words,
                { yPercent: 110, opacity: 0 },
                {
                  yPercent: 0,
                  opacity: 1,
                  duration: 1,
                  ease: 'power4.out',
                  stagger: 0.06,
                  immediateRender: true,
                  scrollTrigger: {
                    trigger: heading,
                    start: 'top 70%',
                    once: true,
                  },
                },
              );
            },
          });
        }

        if (ctas) {
          gsap.fromTo(
            Array.from(ctas.children),
            { y: 20, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'power3.out',
              stagger: 0.12,
              immediateRender: true,
              scrollTrigger: {
                trigger: ctas,
                start: 'top 85%',
                once: true,
              },
            },
          );
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
