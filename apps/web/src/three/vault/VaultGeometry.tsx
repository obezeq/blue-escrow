'use client';

// ---------------------------------------------------------------------------
// VaultGeometry — wireframe icosahedron shell
// Color syncs with particles, opacity pulses gently, hidden when scattered
// ---------------------------------------------------------------------------

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EdgesGeometry, IcosahedronGeometry, LineBasicMaterial } from 'three';
import type { LineSegments as LineSegmentsType } from 'three';
import { VAULT_GEOMETRY, COLORS } from '../config/vaultConfig';
import { useVaultTimeline } from '../hooks/useVaultTimeline';
import { useParticleColor } from '../hooks/useParticleColor';

interface VaultGeometryProps {
  reducedMotion?: boolean;
}

export function VaultGeometry({ reducedMotion = false }: VaultGeometryProps) {
  const lineRef = useRef<LineSegmentsType>(null);
  const { stateRef } = useVaultTimeline();
  const colorRef = useParticleColor();

  const edgesGeo = useMemo(() => {
    const ico = new IcosahedronGeometry(
      VAULT_GEOMETRY.radius,
      VAULT_GEOMETRY.detail,
    );
    const edges = new EdgesGeometry(ico);
    ico.dispose();
    return edges;
  }, []);

  useFrame((state) => {
    const line = lineRef.current;
    if (!line) return;

    const mat = line.material as LineBasicMaterial;

    if (reducedMotion) {
      mat.opacity = 0.15;
      mat.visible = true;
      const { r, g, b } = colorRef.current;
      mat.color.setRGB(r, g, b);
      return;
    }

    const currentState = stateRef.current;

    // Hidden during scattered state
    const isScattered = currentState === 'scattered' || currentState === 'shattering';
    const targetOpacity = isScattered ? 0 : 0.15 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;

    mat.opacity += (targetOpacity - mat.opacity) * 0.05;
    mat.visible = mat.opacity > 0.01;

    // Sync color with particles
    const { r, g, b } = colorRef.current;
    mat.color.setRGB(r, g, b);
  });

  return (
    <lineSegments ref={lineRef} geometry={edgesGeo}>
      <lineBasicMaterial transparent opacity={0.15} color={0xffffff} />
    </lineSegments>
  );
}
