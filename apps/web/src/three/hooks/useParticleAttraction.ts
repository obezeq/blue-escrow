// ---------------------------------------------------------------------------
// useParticleAttraction — Center-contraction on CTA hover
// When ctaHovered=true, nearby particles contract toward vault origin.
// Uses exponential strength smoothing for organic feel.
// ---------------------------------------------------------------------------

import { useCallback, useRef } from 'react';
import { useThreeContext } from '@/providers/ThreeProvider';
import type { ParticleBuffers } from '../vault/stateHandlers';

/** Max contraction factor (0.3 = 30% closer to origin) */
const MAX_CONTRACTION = 0.3;

/** Smoothing speed for strength ramp-up/down */
const STRENGTH_LERP_SPEED = 3;

export function useParticleAttraction() {
  const { ctaHovered } = useThreeContext();
  const strengthRef = useRef(0);

  const applyAttraction = useCallback(
    (buffers: ParticleBuffers, count: number, delta: number) => {
      // Smooth strength toward target
      const target = ctaHovered ? 1 : 0;
      const lerpFactor = 1 - Math.exp(-STRENGTH_LERP_SPEED * delta);
      strengthRef.current += (target - strengthRef.current) * lerpFactor;

      // Skip if negligible
      if (strengthRef.current < 0.001) return;

      const contraction = strengthRef.current * MAX_CONTRACTION;
      const tPos = buffers.targetPositions;

      // Contract each particle's target position toward origin
      for (let i = 0, len = count * 3; i < len; i++) {
        tPos[i]! *= 1 - contraction;
      }
    },
    [ctaHovered],
  );

  return applyAttraction;
}
