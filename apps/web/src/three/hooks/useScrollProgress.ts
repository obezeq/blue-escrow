// ---------------------------------------------------------------------------
// Smoothed scroll progress for Three.js — wraps LenisProvider's ref with
// per-frame exponential lerp for buttery transitions
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScrollProgress as useRawScrollProgress } from '@/providers/LenisProvider';

// Exponential smoothing factor (1/s). Higher = snappier response, lower = silkier lag.
const SCROLL_SMOOTHING_FACTOR = 12;

/**
 * Returns a ref with smoothed scroll progress (0-1).
 * Reads from LenisProvider's ref (auto-bridged via R3F v9) and applies
 * exponential smoothing so 3D transitions feel buttery.
 */
export function useSmoothedScroll(): React.MutableRefObject<number> {
  const rawRef = useRawScrollProgress();
  const smoothedRef = useRef(0);

  useFrame((_, delta) => {
    const raw = rawRef.current;
    const factor = 1 - Math.exp(-SCROLL_SMOOTHING_FACTOR * delta);
    smoothedRef.current += (raw - smoothedRef.current) * factor;
  });

  return smoothedRef;
}
