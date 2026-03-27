'use client';

// ---------------------------------------------------------------------------
// BloomEffect — EffectComposer always mounted, intensity lerped to 0 on
// white sections. Zero React re-renders for bloom toggling.
//
// Postprocessing is lazy-imported to avoid a circular JSON crash that occurs
// during module initialization in some React 19 / R3F 9 combinations.
// If the import or render fails, bloom degrades gracefully to nothing.
// ---------------------------------------------------------------------------

import { Component, Suspense, lazy, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { BLOOM } from '../config/vaultConfig';
import { useVaultTimeline } from '../hooks/useVaultTimeline';

// Lazy-import postprocessing — avoids top-level import crash
const LazyBloomInner = lazy(() =>
  import('@react-three/postprocessing').then((mod) => ({
    default: mod.Bloom,
  })),
);

const LazyEffectComposer = lazy(() =>
  import('@react-three/postprocessing').then((mod) => ({
    default: mod.EffectComposer,
  })),
);

/**
 * Error boundary for postprocessing effects.
 * Catches render-phase errors so the page degrades to no bloom.
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

function BloomInner() {
  const bloomRef = useRef<any>(null);
  const { bloomRef: bloomEnabledRef } = useVaultTimeline();
  const currentIntensity = useRef(0);

  useFrame((_, delta) => {
    if (!bloomRef.current) return;

    const target = bloomEnabledRef.current ? BLOOM.intensity : 0;
    const factor = 1 - Math.exp(-8 * delta);
    currentIntensity.current += (target - currentIntensity.current) * factor;

    if (currentIntensity.current < 0.01) {
      currentIntensity.current = 0;
    }

    bloomRef.current.intensity = currentIntensity.current;
  });

  return (
    <LazyEffectComposer>
      <LazyBloomInner
        ref={bloomRef}
        intensity={0}
        luminanceThreshold={BLOOM.threshold}
        luminanceSmoothing={BLOOM.smoothing}
        mipmapBlur
      />
    </LazyEffectComposer>
  );
}

export function BloomEffect({ enabled }: BloomEffectProps) {
  if (!enabled) return null;

  return (
    <BloomErrorBoundary>
      <Suspense fallback={null}>
        <BloomInner />
      </Suspense>
    </BloomErrorBoundary>
  );
}
