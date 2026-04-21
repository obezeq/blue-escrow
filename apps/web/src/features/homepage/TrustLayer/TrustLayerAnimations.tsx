'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

/**
 * Client wrapper that adds GSAP animations to TrustLayer.
 * Desktop+tablet: self-typing code + stagger stat reveals + counters.
 * Mobile: simpler scroll reveals, counters still animate.
 * Reduced motion: all content visible, key-line glow applied statically.
 */
export function TrustLayerAnimations({
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

      // Desktop + tablet: rich animations
      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          buildDesktopAnimations(container);
        },
      );

      // Mobile: simpler scroll reveals
      mm.add(
        '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        () => {
          buildMobileFallback(container);
        },
      );

      // Reduced motion: all visible, key-line glow static
      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(
          container.querySelectorAll('[data-animate], [data-char]'),
          { clearProps: 'all' },
        );
      });
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Desktop + tablet: typing + stats + counters
// ---------------------------------------------------------------------------

function buildDesktopAnimations(container: HTMLElement) {
  const codeBlock = container.querySelector('[data-animate="code-block"]');
  const statsContainer = container.querySelector('[data-animate="stats"]');

  if (codeBlock) {
    buildTypingAnimation(codeBlock as HTMLElement);
  }

  if (statsContainer) {
    buildStatsReveal(statsContainer as HTMLElement);
    buildCounters(container);
  }
}

function buildTypingAnimation(codeBlock: HTMLElement) {
  const chars = codeBlock.querySelectorAll('[data-char]');
  const keyLine = codeBlock.querySelector('[data-highlight="key-line"]');

  if (!chars.length) return;

  // Set all chars invisible initially
  gsap.set(chars, { opacity: 0 });

  // Key-line glow starts hidden
  if (keyLine) {
    gsap.set(keyLine, {
      boxShadow: '0 0 0px rgba(0, 102, 255, 0)',
      backgroundColor: 'rgba(0, 102, 255, 0)',
    });
  }

  // Find the index of the first char in the key line
  const allCharsArray = Array.from(chars);
  const keyLineChars = keyLine ? keyLine.querySelectorAll('[data-char]') : [];
  const firstKeyChar = keyLineChars.length > 0 ? keyLineChars[0] : null;
  const keyLineStartIndex = firstKeyChar
    ? allCharsArray.indexOf(firstKeyChar as Element)
    : -1;

  // Create timeline for the typing sequence
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: codeBlock,
      start: 'top 70%',
      once: true,
    },
  });

  // Type all characters with stagger
  tl.to(chars, {
    opacity: 1,
    duration: 0.02,
    stagger: 0.008,
    ease: 'none',
  });

  // After typing reaches the key line, activate glow
  if (keyLine && keyLineStartIndex > 0) {
    const glowDelay = keyLineStartIndex * 0.008;
    tl.to(
      keyLine,
      {
        boxShadow: '0 0 16px rgba(0, 102, 255, 0.12)',
        backgroundColor: 'rgba(0, 102, 255, 0.08)',
        duration: 0.6,
        ease: 'power2.out',
      },
      glowDelay,
    );
  }
}

function buildStatsReveal(statsContainer: HTMLElement) {
  const cards = statsContainer.children;

  gsap.from(cards, {
    x: 40,
    opacity: 0,
    duration: 0.6,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: statsContainer,
      start: 'top 75%',
      once: true,
    },
  });
}

function buildCounters(container: HTMLElement) {
  // "100%" counter
  const onchainEl = container.querySelector(
    '[data-animate="counter-onchain"]',
  ) as HTMLElement | null;

  if (onchainEl) {
    onchainEl.textContent = '0%';
    const proxy = { value: 0 };

    gsap.to(proxy, {
      value: 100,
      duration: 2,
      ease: 'power2.out',
      onUpdate() {
        onchainEl.textContent = `${Math.round(proxy.value)}%`;
      },
      scrollTrigger: {
        trigger: onchainEl,
        start: 'top 80%',
        once: true,
      },
    });
  }

  // "33 days" counter
  const auditEl = container.querySelector(
    '[data-animate="counter-audit"]',
  ) as HTMLElement | null;

  if (auditEl) {
    auditEl.textContent = '0 days';
    const proxy = { value: 0 };

    gsap.to(proxy, {
      value: 33,
      duration: 2,
      ease: 'power2.out',
      onUpdate() {
        auditEl.textContent = `${Math.round(proxy.value)} days`;
      },
      scrollTrigger: {
        trigger: auditEl,
        start: 'top 80%',
        once: true,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Mobile: simple scroll reveals
// ---------------------------------------------------------------------------

function buildMobileFallback(container: HTMLElement) {
  const codeBlock = container.querySelector('[data-animate="code-block"]');
  const statsContainer = container.querySelector('[data-animate="stats"]');

  // Code block fades in
  if (codeBlock) {
    const chars = codeBlock.querySelectorAll('[data-char]');

    // Still do typing on mobile but faster
    if (chars.length) {
      gsap.set(chars, { opacity: 0 });

      gsap.to(chars, {
        opacity: 1,
        duration: 0.02,
        stagger: 0.005,
        ease: 'none',
        scrollTrigger: {
          trigger: codeBlock,
          start: 'top 80%',
          once: true,
        },
      });
    }
  }

  // Stats fade in
  if (statsContainer) {
    gsap.from(Array.from(statsContainer.children), {
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: statsContainer,
        start: 'top 80%',
        once: true,
      },
    });
  }

  // Counters still animate
  buildCounters(container);
}
