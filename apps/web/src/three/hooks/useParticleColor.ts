// ---------------------------------------------------------------------------
// Particle color resolver — determines target RGB from scroll position
// Handles boundary transitions and special colors (danger, middleman, seller)
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  COLORS,
  COLOR_TRANSITIONS,
  COLOR_TRANSITION_WIDTH,
} from '../config/vaultConfig';
import { useSmoothedScroll } from './useScrollProgress';

export interface ParticleColorTarget {
  r: number;
  g: number;
  b: number;
}

function lerpValue(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Returns a ref with the current target particle color (linear RGB).
 * Smoothly transitions at section boundaries.
 */
export function useParticleColor(): React.MutableRefObject<ParticleColorTarget> {
  const scrollRef = useSmoothedScroll();
  const colorRef = useRef<ParticleColorTarget>({ ...COLORS.particleOnBlue });

  useFrame(() => {
    const progress = scrollRef.current;

    // Start with the base color for the current bg
    let targetR: number = COLORS.particleOnBlue.r;
    let targetG: number = COLORS.particleOnBlue.g;
    let targetB: number = COLORS.particleOnBlue.b;

    // Check each transition boundary
    for (const transition of COLOR_TRANSITIONS) {
      const halfWidth = COLOR_TRANSITION_WIDTH / 2;
      const start = transition.at - halfWidth;
      const end = transition.at + halfWidth;

      if (progress < start) {
        // Before this transition
        targetR = transition.from.r;
        targetG = transition.from.g;
        targetB = transition.from.b;
        break;
      } else if (progress >= start && progress <= end) {
        // In the transition zone — lerp
        const t = (progress - start) / (end - start);
        targetR = lerpValue(transition.from.r, transition.to.r, t);
        targetG = lerpValue(transition.from.g, transition.to.g, t);
        targetB = lerpValue(transition.from.b, transition.to.b, t);
        break;
      } else {
        // After this transition — use the "to" color as new base
        targetR = transition.to.r;
        targetG = transition.to.g;
        targetB = transition.to.b;
      }
    }

    colorRef.current.r = targetR;
    colorRef.current.g = targetG;
    colorRef.current.b = targetB;
  });

  return colorRef;
}

/**
 * Composes the final color for a particle given its colorFactor.
 * factor = 0 → white (on blue bg), factor = 1 → blue (on white bg),
 * factor = -1 → danger red (shattering flash)
 */
export function composeParticleColor(
  factor: number,
  baseColor: ParticleColorTarget,
): { r: number; g: number; b: number } {
  if (factor <= -0.5) {
    // Danger flash
    const t = Math.abs(factor + 1); // -1 → 0, -0.5 → 0.5
    return {
      r: lerpValue(COLORS.danger.r, baseColor.r, t),
      g: lerpValue(COLORS.danger.g, baseColor.g, t),
      b: lerpValue(COLORS.danger.b, baseColor.b, t),
    };
  }

  const clamped = Math.max(0, Math.min(1, factor));
  return {
    r: lerpValue(COLORS.particleOnBlue.r, COLORS.particleOnWhite.r, clamped),
    g: lerpValue(COLORS.particleOnBlue.g, COLORS.particleOnWhite.g, clamped),
    b: lerpValue(COLORS.particleOnBlue.b, COLORS.particleOnWhite.b, clamped),
  };
}
