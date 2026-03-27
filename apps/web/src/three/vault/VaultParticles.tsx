'use client';

// ---------------------------------------------------------------------------
// VaultParticles — THE CORE
// InstancedMesh with 12K particles, scroll-driven state machine,
// raw typed array manipulation, zero GC in useFrame
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Color } from 'three';
import type { VaultState } from '@/providers/ThreeProvider';
import { VAULT_GEOMETRY, PARTICLE, ANIMATION, COLORS } from '../config/vaultConfig';
import { useVaultTimeline } from '../hooks/useVaultTimeline';
import { useParticleColor, composeParticleColor } from '../hooks/useParticleColor';
import {
  sampleIcosahedronSurface,
  generateRandomPositions,
  groupFacesByRegion,
} from './geometry';
import {
  STATE_HANDLERS,
  type ParticleBuffers,
  type StateHandlerContext,
} from './stateHandlers';

interface VaultParticlesProps {
  count: number;
  reducedMotion: boolean;
}

export function VaultParticles({ count, reducedMotion }: VaultParticlesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const prevStateRef = useRef<VaultState | null>(null);

  const { stateRef, subProgressRef, bloomRef } = useVaultTimeline();
  const colorTargetRef = useParticleColor();

  // Pre-allocate all buffers at mount
  const buffers = useMemo<ParticleBuffers>(() => {
    const buf: ParticleBuffers = {
      positions: new Float32Array(count * 3),
      targetPositions: new Float32Array(count * 3),
      scales: new Float32Array(count).fill(1),
      targetScales: new Float32Array(count).fill(1),
      colorFactors: new Float32Array(count),
      targetColorFactors: new Float32Array(count),
      seeds: new Float32Array(count),
      phases: new Float32Array(count),
      velocities: new Float32Array(count * 3),
    };

    // Initialize seeds and phases
    for (let i = 0; i < count; i++) {
      buf.seeds[i] = Math.random();
      buf.phases[i] = Math.random() * Math.PI * 2;
    }

    return buf;
  }, [count]);

  // Pre-compute geometry data at mount
  const geoData = useMemo(() => {
    const vaultSurfacePositions = sampleIcosahedronSurface(
      count,
      VAULT_GEOMETRY.radius,
      VAULT_GEOMETRY.detail,
    );
    const randomPositions = generateRandomPositions(count, 6);
    const { groups, geometry } = groupFacesByRegion(
      VAULT_GEOMETRY.radius,
      VAULT_GEOMETRY.detail,
    );

    return { vaultSurfacePositions, randomPositions, groups, geometry };
  }, [count]);

  // State handler context (stable reference, mutated in place)
  const ctx = useMemo<StateHandlerContext>(
    () => ({
      buffers,
      count,
      vaultSurfacePositions: geoData.vaultSurfacePositions,
      faceGroups: geoData.groups,
      geometry: geoData.geometry,
      buyerTargets: new Float32Array(0),
      sellerTargets: new Float32Array(0),
      middlemanTargets: new Float32Array(0),
      gapHoverTargets: new Float32Array(0),
    }),
    [buffers, count, geoData],
  );

  // Initialize particle positions
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (reducedMotion) {
      // Static: place on vault surface with correct color
      buffers.positions.set(geoData.vaultSurfacePositions);
      buffers.targetPositions.set(geoData.vaultSurfacePositions);
    } else {
      // Start scattered for forming animation
      buffers.positions.set(geoData.randomPositions);
      buffers.targetPositions.set(geoData.vaultSurfacePositions);
    }

    // Initialize instance color attribute
    const colorArray = mesh.instanceColor?.array;
    if (colorArray) {
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        colorArray[i3] = COLORS.particleOnBlue.r;
        colorArray[i3 + 1] = COLORS.particleOnBlue.g;
        colorArray[i3 + 2] = COLORS.particleOnBlue.b;
      }
      mesh.instanceColor!.needsUpdate = true;
    }

    // Initial matrix write
    writeMatrices(mesh, buffers, count);
  }, [buffers, count, geoData, reducedMotion]);

  // Main animation loop
  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || reducedMotion) return;

    const elapsed = state.clock.elapsedTime;
    const currentState = stateRef.current;
    const subProgress = subProgressRef.current;

    // State transition — call enter() once
    if (currentState !== prevStateRef.current) {
      const handler = STATE_HANDLERS[currentState];
      handler.enter(ctx);
      prevStateRef.current = currentState;
    }

    // Per-frame update
    const handler = STATE_HANDLERS[currentState];
    handler.update(ctx, subProgress, delta, elapsed);

    // Shared lerp loop — positions
    const lerpFactor = 1 - Math.exp(-ANIMATION.lerpSpeed / delta);
    const posLerp = Math.min(lerpFactor, 0.15); // clamp to avoid overshoot
    for (let i = 0; i < count * 3; i++) {
      buffers.positions[i] += (buffers.targetPositions[i] - buffers.positions[i]) * posLerp;
    }

    // Shared lerp loop — scales
    for (let i = 0; i < count; i++) {
      buffers.scales[i] += (buffers.targetScales[i] - buffers.scales[i]) * posLerp;
    }

    // Shared lerp loop — color factors (with per-particle variation)
    const baseColorSpeed = ANIMATION.colorLerpSpeed;
    const colorVariation = ANIMATION.colorLerpVariation;
    for (let i = 0; i < count; i++) {
      const speed = baseColorSpeed + buffers.seeds[i] * colorVariation;
      buffers.colorFactors[i] += (buffers.targetColorFactors[i] - buffers.colorFactors[i]) * speed;
    }

    // Compose instance matrices — write directly to typed array
    writeMatrices(mesh, buffers, count);

    // Write colors to instanceColor array
    const baseColor = colorTargetRef.current;
    const colorArr = mesh.instanceColor?.array;
    if (colorArr) {
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const { r, g, b } = composeParticleColor(buffers.colorFactors[i], baseColor);
        colorArr[i3] = r;
        colorArr[i3 + 1] = g;
        colorArr[i3 + 2] = b;
      }
      mesh.instanceColor!.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[PARTICLE.radius, PARTICLE.widthSegments, PARTICLE.heightSegments]} />
      <meshStandardMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/**
 * Write positions and scales directly to instanceMatrix typed array.
 * Column-major 4x4 with uniform scale, no rotation per particle.
 */
function writeMatrices(
  mesh: InstancedMesh,
  buffers: ParticleBuffers,
  count: number,
): void {
  const matrixArray = mesh.instanceMatrix.array as Float32Array;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const i16 = i * 16;
    const s = buffers.scales[i];

    // Column-major 4x4: scale on diagonal, translation in last column
    matrixArray[i16] = s;
    matrixArray[i16 + 1] = 0;
    matrixArray[i16 + 2] = 0;
    matrixArray[i16 + 3] = 0;
    matrixArray[i16 + 4] = 0;
    matrixArray[i16 + 5] = s;
    matrixArray[i16 + 6] = 0;
    matrixArray[i16 + 7] = 0;
    matrixArray[i16 + 8] = 0;
    matrixArray[i16 + 9] = 0;
    matrixArray[i16 + 10] = s;
    matrixArray[i16 + 11] = 0;
    matrixArray[i16 + 12] = buffers.positions[i3];
    matrixArray[i16 + 13] = buffers.positions[i3 + 1];
    matrixArray[i16 + 14] = buffers.positions[i3 + 2];
    matrixArray[i16 + 15] = 1;
  }

  mesh.instanceMatrix.needsUpdate = true;
}
