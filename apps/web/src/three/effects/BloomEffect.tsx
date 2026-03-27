'use client';

// ---------------------------------------------------------------------------
// BloomEffect — EffectComposer always mounted, intensity lerped to 0 on
// white sections. Zero React re-renders for bloom toggling.
// ---------------------------------------------------------------------------

import { Component, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BLOOM } from '../config/vaultConfig';
import { useVaultTimeline } from '../hooks/useVaultTimeline';

/**
 * Error boundary for postprocessing effects.
 * @react-three/postprocessing can crash with circular JSON serialization
 * errors in some React 19 / R3F 9 combinations. If bloom crashes,
 * the page degrades gracefully to no bloom (particles still render).
 */
class BloomErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface BloomEffectProps {
  enabled: boolean;
}

export function BloomEffect({ enabled }: BloomEffectProps) {
  const bloomRef = useRef<any>(null);
  const { bloomRef: bloomEnabledRef } = useVaultTimeline();
  const currentIntensity = useRef(0);

  useFrame((_, delta) => {
    if (!bloomRef.current || !enabled) return;

    const target = bloomEnabledRef.current ? BLOOM.intensity : 0;
    // Exponential smoothing for soft transition
    const factor = 1 - Math.exp(-8 * delta);
    currentIntensity.current += (target - currentIntensity.current) * factor;

    // Snap to zero below threshold to avoid sub-pixel artifacts
    if (currentIntensity.current < 0.01) {
      currentIntensity.current = 0;
    }

    bloomRef.current.intensity = currentIntensity.current;
  });

  if (!enabled) return null;

  return (
    <BloomErrorBoundary>
      <EffectComposer>
        <Bloom
          ref={bloomRef}
          intensity={0}
          luminanceThreshold={BLOOM.threshold}
          luminanceSmoothing={BLOOM.smoothing}
          mipmapBlur
        />
      </EffectComposer>
    </BloomErrorBoundary>
  );
}
