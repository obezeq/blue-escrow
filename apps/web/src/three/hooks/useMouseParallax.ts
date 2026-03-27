// ---------------------------------------------------------------------------
// Mouse parallax — vault tilts 3° toward cursor, desktop only
// Uses document listener (not R3F events — canvas has pointerEvents:none)
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import { ANIMATION } from '../config/vaultConfig';

interface ParallaxTarget {
  x: number;
  y: number;
}

/**
 * Returns a ref with smoothed { x, y } rotation values (in radians).
 * Desktop only — returns zero on touch devices and reduced-motion.
 */
export function useMouseParallax(): React.MutableRefObject<ParallaxTarget> {
  const targetRef = useRef<ParallaxTarget>({ x: 0, y: 0 });
  const smoothedRef = useRef<ParallaxTarget>({ x: 0, y: 0 });
  const enabledRef = useRef(false);

  useEffect(() => {
    // Skip on touch-primary and reduced-motion
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    enabledRef.current = true;
    const maxAngle = MathUtils.degToRad(ANIMATION.mouseParallaxDegrees);

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1..1
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetRef.current.x = -ny * maxAngle;
      targetRef.current.y = nx * maxAngle;
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    if (!enabledRef.current) return;

    const lerp = ANIMATION.mouseParallaxLerp;
    smoothedRef.current.x += (targetRef.current.x - smoothedRef.current.x) * lerp;
    smoothedRef.current.y += (targetRef.current.y - smoothedRef.current.y) * lerp;
  });

  return smoothedRef;
}
