import type { TweenVars } from 'gsap';

export const fadeInUp: TweenVars = {
  y: 60,
  opacity: 0,
  duration: 0.8,
  ease: 'power3.out',
} as const;
