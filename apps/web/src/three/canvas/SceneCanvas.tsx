'use client';

// ---------------------------------------------------------------------------
// SceneCanvas — persistent Three.js canvas for the marketing layout
// position:fixed, full viewport, z-index 5, pointerEvents:none
// Contains the entire 3D scene: vault particles, geometry, rings, bloom
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import type { Group } from 'three';
import { usePerformanceTier } from '../config/performanceTiers';
import { CAMERA } from '../config/vaultConfig';
import { SceneEnvironment } from './SceneEnvironment';
import { VaultParticles } from '../vault/VaultParticles';
import { VaultGeometry } from '../vault/VaultGeometry';
import { OrbitalRings } from '../vault/OrbitalRing';
import { BloomEffect } from '../effects/BloomEffect';
import { useMouseParallax } from '../hooks/useMouseParallax';
import styles from './SceneCanvas.module.scss';

function VaultScene({
  count,
  bloomEnabled,
  reducedMotion,
}: {
  count: number;
  bloomEnabled: boolean;
  reducedMotion: boolean;
}) {
  const parallaxRef = useMouseParallax();
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.x = parallaxRef.current.x;
    group.rotation.y = parallaxRef.current.y;
  });

  return (
    <group ref={groupRef}>
      <SceneEnvironment />
      <VaultParticles count={count} reducedMotion={reducedMotion} />
      <VaultGeometry reducedMotion={reducedMotion} />
      <OrbitalRings reducedMotion={reducedMotion} />
      <BloomEffect enabled={bloomEnabled} />
    </group>
  );
}

export default function SceneCanvas() {
  const { config, onDowngrade } = usePerformanceTier();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return (
    <div className={styles.canvas} aria-hidden="true">
      <Canvas
        gl={{
          alpha: true,
          antialias: config.antialias,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        dpr={config.dpr}
        camera={{
          fov: CAMERA.fov,
          near: CAMERA.near,
          far: CAMERA.far,
          position: [...CAMERA.position],
        }}
        flat
        frameloop="always"
      >
        <PerformanceMonitor
          ms={200}
          iterations={5}
          threshold={0.8}
          flipflops={3}
          onDecline={onDowngrade}
          onFallback={onDowngrade}
        >
          <VaultScene
            count={config.particleCount}
            bloomEnabled={config.bloomEnabled}
            reducedMotion={reducedMotion}
          />
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
