import type { TweenVars } from 'gsap';

export const staggerReveal: TweenVars = {
  y: 60,
  opacity: 0,
  stagger: 0.15,
  duration: 0.8,
  ease: 'power3.out',
} as const;
