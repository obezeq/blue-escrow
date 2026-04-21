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
          SplitText.create(heading, {
            type: 'words',
            autoSplit: true,
            onSplit(self) {
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
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
