'use client';

import { useRef } from 'react';
import { gsap, SplitText, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { useThreeContext } from '@/providers/ThreeProvider';

export function CtaSectionAnimations({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setCtaHovered } = useThreeContext();

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const mm = gsap.matchMedia();

      // --- Hover dispatch for particle attraction ---
      const primaryCta = container.querySelector('[data-cta="primary"]');
      const onEnter = () => setCtaHovered(true);
      const onLeave = () => setCtaHovered(false);
      if (primaryCta) {
        primaryCta.addEventListener('mouseenter', onEnter);
        primaryCta.addEventListener('mouseleave', onLeave);
      }

      // --- Desktop + tablet animations ---
      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          buildDesktopAnimations(container);
        },
      );

      // --- Mobile animations ---
      mm.add(
        '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        () => {
          buildMobileAnimations(container);
        },
      );

      // --- Reduced motion: all visible ---
      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(container.querySelectorAll('[data-animate]'), {
          clearProps: 'all',
        });
      });

      // Cleanup hover listeners on context revert
      return () => {
        if (primaryCta) {
          primaryCta.removeEventListener('mouseenter', onEnter);
          primaryCta.removeEventListener('mouseleave', onLeave);
          setCtaHovered(false);
        }
      };
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Desktop + tablet
// ---------------------------------------------------------------------------

function buildDesktopAnimations(container: HTMLElement) {
  const heading = container.querySelector('[data-animate="heading"]');
  const subtitle = container.querySelector('[data-animate="subtitle"]');
  const buttons = container.querySelector('[data-animate="buttons"]');
  const trail = container.querySelector('[data-animate="trail"]');

  // Heading: SplitText word reveal
  if (heading) {
    heading.setAttribute('data-split-text', '');
    SplitText.create(heading, {
      type: 'words',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.words, {
          y: 50,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.06,
          scrollTrigger: {
            trigger: heading,
            start: 'top 80%',
            once: true,
          },
        });
      },
    });
  }

  // Subtitle: fade up
  if (subtitle) {
    gsap.from(subtitle, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: subtitle,
        start: 'top 80%',
        once: true,
      },
    });
  }

  // Buttons: stagger fade up
  if (buttons) {
    gsap.from(buttons.children, {
      y: 20,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.12,
      scrollTrigger: {
        trigger: buttons,
        start: 'top 85%',
        once: true,
      },
    });
  }

  // Trail echo: fade in
  if (trail) {
    gsap.from(trail, {
      opacity: 0,
      duration: 1.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: trail,
        start: 'top 90%',
        once: true,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Mobile
// ---------------------------------------------------------------------------

function buildMobileAnimations(container: HTMLElement) {
  const heading = container.querySelector('[data-animate="heading"]');
  const subtitle = container.querySelector('[data-animate="subtitle"]');
  const buttons = container.querySelector('[data-animate="buttons"]');

  // Heading: simple fade up
  if (heading) {
    gsap.from(heading, {
      y: 40,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: heading,
        start: 'top 85%',
        once: true,
      },
    });
  }

  // Subtitle: fade up
  if (subtitle) {
    gsap.from(subtitle, {
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: subtitle,
        start: 'top 85%',
        once: true,
      },
    });
  }

  // Buttons: fade up together
  if (buttons) {
    gsap.from(buttons, {
      y: 20,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: buttons,
        start: 'top 90%',
        once: true,
      },
    });
  }
}
