'use client';

// ---------------------------------------------------------------------------
// VaultParticles — THE CORE
// InstancedMesh with 12K particles, scroll-driven state machine,
// raw typed array manipulation, zero GC in useFrame
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, InstancedBufferAttribute } from 'three';
import type { VaultState } from '@/providers/ThreeProvider';
import { VAULT_GEOMETRY, PARTICLE, ANIMATION, COLORS } from '../config/vaultConfig';
import { useVaultTimeline } from '../hooks/useVaultTimeline';
import { useParticleColor, composeParticleColor } from '../hooks/useParticleColor';
import { useParticleAttraction } from '../hooks/useParticleAttraction';
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
  const applyAttraction = useParticleAttraction();

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

  // Initialize particle positions and instanceColor attribute
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (reducedMotion) {
      buffers.positions.set(geoData.vaultSurfacePositions);
      buffers.targetPositions.set(geoData.vaultSurfacePositions);
    } else {
      buffers.positions.set(geoData.randomPositions);
      buffers.targetPositions.set(geoData.vaultSurfacePositions);
    }

    // Create instanceColor if missing (R3F doesn't auto-create it)
    if (!mesh.instanceColor) {
      const colorArray = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        colorArray[i3] = COLORS.particleOnBlue.r;
        colorArray[i3 + 1] = COLORS.particleOnBlue.g;
        colorArray[i3 + 2] = COLORS.particleOnBlue.b;
      }
      mesh.instanceColor = new InstancedBufferAttribute(colorArray, 3);
    }

    writeMatrices(mesh, buffers, count);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
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

    // Particle attraction toward origin on CTA hover (peaceful state only)
    if (currentState === 'peaceful') {
      applyAttraction(buffers, count, delta);
    }

    // Shared lerp loop — positions
    const lerpFactor = 1 - Math.exp(-ANIMATION.lerpSpeed / delta);
    const posLerp = Math.min(lerpFactor, 0.15);
    const pos = buffers.positions;
    const tPos = buffers.targetPositions;
    for (let i = 0, len = count * 3; i < len; i++) {
      pos[i]! += (tPos[i]! - pos[i]!) * posLerp;
    }

    // Shared lerp loop — scales
    const sc = buffers.scales;
    const tSc = buffers.targetScales;
    for (let i = 0; i < count; i++) {
      sc[i]! += (tSc[i]! - sc[i]!) * posLerp;
    }

    // Shared lerp loop — color factors (with per-particle variation)
    const baseColorSpeed = ANIMATION.colorLerpSpeed;
    const colorVariation = ANIMATION.colorLerpVariation;
    const cf = buffers.colorFactors;
    const tCf = buffers.targetColorFactors;
    for (let i = 0; i < count; i++) {
      const speed = baseColorSpeed + buffers.seeds[i]! * colorVariation;
      cf[i]! += (tCf[i]! - cf[i]!) * speed;
    }

    // Compose instance matrices
    writeMatrices(mesh, buffers, count);

    // Write colors to instanceColor array
    if (!mesh.instanceColor) return;
    const baseColor = colorTargetRef.current;
    const colorArr = mesh.instanceColor.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const { r, g, b } = composeParticleColor(cf[i]!, baseColor);
      colorArr[i3] = r;
      colorArr[i3 + 1] = g;
      colorArr[i3 + 2] = b;
    }
    mesh.instanceColor.needsUpdate = true;
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

  const pos = buffers.positions;
  const sc = buffers.scales;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const i16 = i * 16;
    const s = sc[i]!;

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
    matrixArray[i16 + 12] = pos[i3]!;
    matrixArray[i16 + 13] = pos[i3 + 1]!;
    matrixArray[i16 + 14] = pos[i3 + 2]!;
    matrixArray[i16 + 15] = 1;
  }

  mesh.instanceMatrix.needsUpdate = true;
}
