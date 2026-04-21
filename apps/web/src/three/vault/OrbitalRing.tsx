'use client';

// ---------------------------------------------------------------------------
// OrbitalRing — three torus rings representing buyer, seller, middleman
// Middleman ring uses dashed material with visible gap
// Visible only in REBUILT+ states
// ---------------------------------------------------------------------------

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Euler, Float32BufferAttribute, MathUtils } from 'three';
import type { Group, Mesh, LineSegments as LineSegmentsType } from 'three';
import { ORBITAL_RINGS, COLORS } from '../config/vaultConfig';
import { useVaultTimeline } from '../hooks/useVaultTimeline';

const VISIBLE_STATES = new Set([
  'rebuilt',
  'morphing',
  'peaceful',
]);

const RING_TILTS = [
  new Euler(MathUtils.degToRad(15), 0, MathUtils.degToRad(10)),
  new Euler(MathUtils.degToRad(-20), MathUtils.degToRad(30), 0),
  new Euler(MathUtils.degToRad(5), MathUtils.degToRad(-15), MathUtils.degToRad(25)),
];

const ROTATION_SPEEDS = [0.15, -0.12, 0.08];

interface OrbitalRingsProps {
  reducedMotion?: boolean;
}

export function OrbitalRings({ reducedMotion = false }: OrbitalRingsProps) {
  const groupRef = useRef<Group>(null);
  const opacityRef = useRef(0);
  const { stateRef, bgRef, scrollRef } = useVaultTimeline();

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const isVisible = VISIBLE_STATES.has(stateRef.current);
    // Fade out near footer (scroll > 0.96)
    const scrollFade = scrollRef.current > 0.96
      ? Math.max(0, 1 - (scrollRef.current - 0.96) / 0.04)
      : 1;
    const targetOpacity = isVisible ? 0.6 * scrollFade : 0;
    opacityRef.current += (targetOpacity - opacityRef.current) * 0.04;

    group.visible = opacityRef.current > 0.01;
    if (!group.visible) return;

    const onBlue = bgRef.current === 'blue';

    for (let i = 0; i < group.children.length; i++) {
      const child = group.children[i]!;

      // Rotate each ring (skip when reduced motion)
      if (!reducedMotion) {
        child.rotation.z = state.clock.elapsedTime * (ROTATION_SPEEDS[i] ?? 0.1);
      }

      // Update material opacity
      const mesh = child as Mesh | LineSegmentsType;
      const mat = mesh.material as { opacity?: number; color?: { setRGB: (r: number, g: number, b: number) => void } };
      if (mat.opacity !== undefined) {
        mat.opacity = opacityRef.current;
      }

      // Update color based on section bg
      if (mat.color && i < 2) {
        if (onBlue) {
          const brightness = i === 0 ? 1 : 0.85;
          mat.color.setRGB(brightness, brightness, brightness);
        } else {
          const color = i === 0 ? COLORS.buyer : COLORS.seller;
          mat.color.setRGB(color.r, color.g, color.b);
        }
      }
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Buyer ring */}
      <mesh rotation={RING_TILTS[0]}>
        <torusGeometry args={[ORBITAL_RINGS.buyer.radius, ORBITAL_RINGS.buyer.tube, 16, 100]} />
        <meshBasicMaterial transparent opacity={0} color={0x0066ff} />
      </mesh>

      {/* Seller ring */}
      <mesh rotation={RING_TILTS[1]}>
        <torusGeometry args={[ORBITAL_RINGS.seller.radius, ORBITAL_RINGS.seller.tube, 16, 100]} />
        <meshBasicMaterial transparent opacity={0} color={0x33aaff} />
      </mesh>

      {/* Middleman ring — dashed with gap */}
      <MiddlemanRing />
    </group>
  );
}

function MiddlemanRing() {
  const lineRef = useRef<LineSegmentsType>(null);

  // Create a dashed torus as line segments
  const geometry = useMemo(() => {
    const { radius, tube } = ORBITAL_RINGS.middleman;
    const segments = 80;
    const dashRatio = 0.7; // 70% visible, 30% gap

    const positions: number[] = [];
    const totalSegments = segments;
    const visibleSegments = Math.floor(totalSegments * dashRatio);

    for (let i = 0; i < visibleSegments; i++) {
      const t1 = (i / totalSegments) * Math.PI * 2;
      const t2 = ((i + 1) / totalSegments) * Math.PI * 2;

      positions.push(
        Math.cos(t1) * radius, Math.sin(t1) * radius, 0,
        Math.cos(t2) * radius, Math.sin(t2) * radius, 0,
      );
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <lineSegments ref={lineRef} geometry={geometry} rotation={RING_TILTS[2]}>
      <lineBasicMaterial
        transparent
        opacity={0}
        color={0x999999}
      />
    </lineSegments>
  );
}
