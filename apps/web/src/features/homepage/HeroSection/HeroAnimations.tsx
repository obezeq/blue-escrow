'use client';

import { useRef } from 'react';
import { gsap, SplitText, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

/**
 * Thin client wrapper that adds GSAP animations to the SSR-rendered hero content.
 * The children (h1, subtitle, CTAs) are server-rendered HTML — this wrapper
 * finds them via DOM queries and enhances with SplitText + scroll-triggered reveals.
 *
 * Without JS: all children render at default CSS opacity (fully visible).
 */
export function HeroAnimations({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const mm = gsap.matchMedia();

      mm.add(MATCH_MEDIA.noReducedMotion, () => {
        const container = containerRef.current!;

        // SplitText on h1
        const h1 = container.querySelector('h1');
        if (h1) {
          h1.setAttribute('data-split-text', '');
          SplitText.create(h1, {
            type: 'words',
            autoSplit: true,
            onSplit(self) {
              return gsap.from(self.words, {
                y: 60,
                opacity: 0,
                duration: 0.8,
                ease: 'power3.out',
                stagger: 0.04,
                scrollTrigger: {
                  trigger: h1,
                  start: 'top 80%',
                  once: true,
                },
              });
            },
          });
        }

        // Subtitle fade-in
        const subtitle = container.querySelector('p');
        if (subtitle) {
          gsap.from(subtitle, {
            y: 40,
            opacity: 0,
            duration: 0.8,
            delay: 0.3,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: subtitle,
              start: 'top 85%',
              once: true,
            },
          });
        }

        // CTA buttons stagger
        const ctaContainer = container.querySelector('div:last-child');
        if (ctaContainer) {
          const ctas = ctaContainer.querySelectorAll('a, button');
          if (ctas.length) {
            gsap.from(ctas, {
              y: 30,
              opacity: 0,
              duration: 0.6,
              stagger: 0.15,
              delay: 0.5,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: ctaContainer,
                start: 'top 90%',
                once: true,
              },
            });
          }
        }
      });

      // Reduced motion: no-op — text stays visible at CSS defaults
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
