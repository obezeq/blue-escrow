'use client';

// ---------------------------------------------------------------------------
// Scene lighting — ambient + directional + point light synced with particles
// No fog (backgrounds alternate via DOM)
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PointLight } from 'three';
import { LIGHTING } from '../config/vaultConfig';
import { useParticleColor } from '../hooks/useParticleColor';

export function SceneEnvironment() {
  const pointLightRef = useRef<PointLight>(null);
  const colorRef = useParticleColor();

  useFrame(() => {
    const light = pointLightRef.current;
    if (!light) return;

    // Sync point light color with particle color
    const { r, g, b } = colorRef.current;
    light.color.setRGB(r, g, b);
  });

  return (
    <>
      <ambientLight intensity={LIGHTING.ambient.intensity} />
      <directionalLight
        position={LIGHTING.directional.position}
        intensity={LIGHTING.directional.intensity}
      />
      <pointLight
        ref={pointLightRef}
        position={[0, 0, 0]}
        intensity={LIGHTING.point.intensity}
        distance={10}
        decay={2}
      />
    </>
  );
}
