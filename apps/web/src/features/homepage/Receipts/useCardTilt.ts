'use client';

import { useEffect } from 'react';
import { gsap } from '@/animations/config/gsap-register';

interface TiltOptions {
  /** Max tilt angle in degrees for each axis. */
  maxAngle?: number;
  /** Ease-in duration (seconds) while mouse moves. */
  durationIn?: number;
  /** Ease-out duration (seconds) back to 0 on leave. */
  durationOut?: number;
}

/**
 * Attach a mouse-tilt behavior to every element matching `selector`
 * inside `scope`. Desktop-only — the effect is skipped on touch-primary
 * pointers and when the user prefers reduced motion.
 *
 * The tilt is bounded by `maxAngle` on both X and Y; cursor centered
 * on the card -> no tilt, cursor at a corner -> max tilt.
 */
export function useCardTilt(
  scope: React.RefObject<HTMLElement | null>,
  selector: string,
  options: TiltOptions = {},
) {
  const {
    maxAngle = 10,
    durationIn = 0.5,
    durationOut = 0.8,
  } = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!scope.current) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cards = Array.from(
      scope.current.querySelectorAll<HTMLElement>(selector),
    );
    const cleanups: Array<() => void> = [];

    cards.forEach((card) => {
      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: x * maxAngle,
          rotateX: -y * maxAngle,
          duration: durationIn,
          ease: 'power3.out',
        });
      };
      const onLeave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: durationOut,
          ease: 'power3.out',
        });
      };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [scope, selector, maxAngle, durationIn, durationOut]);
}
