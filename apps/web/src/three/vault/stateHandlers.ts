// ---------------------------------------------------------------------------
// Vault state machine handlers — Strategy Pattern
// Each handler sets TARGET positions/colors. The shared lerp loop in
// VaultParticles applies smooth interpolation every frame.
//
// NOTE: All typed array access in this file is within bounds-checked loops.
// Non-null assertions (!) are safe because buffer sizes match particle count.
// ---------------------------------------------------------------------------

import type { IcosahedronGeometry } from 'three';
import type { VaultState } from '@/providers/ThreeProvider';
import { ANIMATION, VAULT_GEOMETRY } from '../config/vaultConfig';
import type { FaceGroups } from './geometry';
import {
  sampleIcosahedronSurface,
  sampleFaceGroup,
} from './geometry';

// ---------------------------------------------------------------------------
// Context passed to every handler
// ---------------------------------------------------------------------------

export interface ParticleBuffers {
  positions: Float32Array;
  targetPositions: Float32Array;
  scales: Float32Array;
  targetScales: Float32Array;
  colorFactors: Float32Array;
  targetColorFactors: Float32Array;
  seeds: Float32Array;
  phases: Float32Array;
  velocities: Float32Array;
}

export interface StateHandlerContext {
  buffers: ParticleBuffers;
  count: number;
  vaultSurfacePositions: Float32Array;
  faceGroups: FaceGroups;
  geometry: IcosahedronGeometry;
  buyerTargets: Float32Array;
  sellerTargets: Float32Array;
  middlemanTargets: Float32Array;
  gapHoverTargets: Float32Array;
}

// ---------------------------------------------------------------------------
// Handler interface
// ---------------------------------------------------------------------------

export interface StateHandler {
  enter(ctx: StateHandlerContext): void;
  update(ctx: StateHandlerContext, subProgress: number, delta: number, elapsed: number): void;
}

// ---------------------------------------------------------------------------
// Partition helpers
// ---------------------------------------------------------------------------

function getParticleRange(
  group: 'buyer' | 'seller' | 'middleman' | 'gap',
  count: number,
): [number, number] {
  const buyerEnd = Math.floor(count * 0.33);
  const sellerEnd = Math.floor(count * 0.66);
  const middlemanEnd = Math.floor(count * 0.86);

  switch (group) {
    case 'buyer': return [0, buyerEnd];
    case 'seller': return [buyerEnd, sellerEnd];
    case 'middleman': return [sellerEnd, middlemanEnd];
    case 'gap': return [middlemanEnd, count];
  }
}

// ---------------------------------------------------------------------------
// FORMING: random → vault surface
// ---------------------------------------------------------------------------

const formingHandler: StateHandler = {
  enter(ctx) {
    const { buffers, count, vaultSurfacePositions } = ctx;
    buffers.targetPositions.set(vaultSurfacePositions.subarray(0, count * 3));
    for (let i = 0; i < count; i++) {
      buffers.targetScales[i] = 1;
      buffers.targetColorFactors[i] = 0;
    }
  },
  update() {
    // Targets set in enter — lerp handled by shared loop
  },
};

// ---------------------------------------------------------------------------
// COMPLETE: hold shape, gentle noise drift
// ---------------------------------------------------------------------------

const completeHandler: StateHandler = {
  enter(ctx) {
    const { buffers, count, vaultSurfacePositions } = ctx;
    buffers.targetPositions.set(vaultSurfacePositions.subarray(0, count * 3));
    for (let i = 0; i < count; i++) {
      buffers.targetScales[i] = 1;
      buffers.targetColorFactors[i] = 0;
    }
  },
  update(ctx, _subProgress, _delta, elapsed) {
    const { buffers, count, vaultSurfacePositions } = ctx;
    const { driftAmplitude, driftFrequency } = ANIMATION;
    const tp = buffers.targetPositions;
    const ph = buffers.phases;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = ph[i]!;
      const drift = Math.sin(elapsed * driftFrequency + phase) * driftAmplitude;
      tp[i3] = vaultSurfacePositions[i3]! + drift;
      tp[i3 + 1] = vaultSurfacePositions[i3 + 1]! + drift * 0.7;
      tp[i3 + 2] = vaultSurfacePositions[i3 + 2]! + drift * 0.5;
    }
  },
};

// ---------------------------------------------------------------------------
// SHATTERING: explode outward + danger flash, color WHITE → BLUE
// ---------------------------------------------------------------------------

const shatteringHandler: StateHandler = {
  enter(ctx) {
    const { buffers, count } = ctx;
    const pos = buffers.positions;
    const vel = buffers.velocities;
    const sd = buffers.seeds;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const px = pos[i3]!;
      const py = pos[i3 + 1]!;
      const pz = pos[i3 + 2]!;
      const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
      const force = ANIMATION.shatterForce * (0.5 + sd[i]!);
      vel[i3] = (px / len) * force;
      vel[i3 + 1] = (py / len) * force;
      vel[i3 + 2] = (pz / len) * force;
    }
  },
  update(ctx, subProgress, delta) {
    const { buffers, count } = ctx;
    const damping = 0.96;
    const flashEnd = ANIMATION.shatterDangerFlashDuration;
    const pos = buffers.positions;
    const tp = buffers.targetPositions;
    const vel = buffers.velocities;
    const sd = buffers.seeds;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      vel[i3] = vel[i3]! * damping;
      vel[i3 + 1] = vel[i3 + 1]! * damping;
      vel[i3 + 2] = vel[i3 + 2]! * damping;

      tp[i3] = pos[i3]! + vel[i3]! * delta;
      tp[i3 + 1] = pos[i3 + 1]! + vel[i3 + 1]! * delta;
      tp[i3 + 2] = pos[i3 + 2]! + vel[i3 + 2]! * delta;

      if (subProgress < flashEnd) {
        buffers.targetColorFactors[i] = -1;
      } else {
        buffers.targetColorFactors[i] = (subProgress - flashEnd) / (1 - flashEnd);
      }

      buffers.targetScales[i] = 0.8 + sd[i]! * 0.4;
    }
  },
};

// ---------------------------------------------------------------------------
// SCATTERED: brownian chaos, blue particles on white bg
// ---------------------------------------------------------------------------

const scatteredHandler: StateHandler = {
  enter(ctx) {
    const { buffers, count } = ctx;
    const sd = buffers.seeds;
    for (let i = 0; i < count; i++) {
      buffers.targetColorFactors[i] = 1;
      buffers.targetScales[i] = 0.6 + sd[i]! * 0.4;
    }
  },
  update(ctx, _subProgress, delta, elapsed) {
    const { buffers, count } = ctx;
    const { brownianForce } = ANIMATION;
    const tp = buffers.targetPositions;
    const ph = buffers.phases;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = ph[i]!;
      tp[i3] = tp[i3]! + Math.sin(elapsed * 1.3 + phase) * brownianForce * delta;
      tp[i3 + 1] = tp[i3 + 1]! + Math.cos(elapsed * 0.9 + phase * 2) * brownianForce * delta;
      tp[i3 + 2] = tp[i3 + 2]! + Math.sin(elapsed * 1.1 + phase * 3) * brownianForce * delta;
    }
  },
};

// ---------------------------------------------------------------------------
// REBUILDING: particles converge to assigned face group positions
// ---------------------------------------------------------------------------

function createRebuildingHandler(
  group: 'buyer' | 'seller' | 'middleman',
): StateHandler {
  return {
    enter(ctx) {
      const { buffers, count, faceGroups, geometry } = ctx;
      const [start, end] = getParticleRange(group, count);
      const groupCount = end - start;

      const targets = sampleFaceGroup(faceGroups[group], geometry, groupCount);
      if (group === 'buyer') ctx.buyerTargets = targets;
      else if (group === 'seller') ctx.sellerTargets = targets;
      else ctx.middlemanTargets = targets;

      const tp = buffers.targetPositions;
      for (let i = 0; i < groupCount; i++) {
        const pi = start + i;
        const i3 = pi * 3;
        const t3 = i * 3;
        tp[i3] = targets[t3]!;
        tp[i3 + 1] = targets[t3 + 1]!;
        tp[i3 + 2] = targets[t3 + 2]!;
        buffers.targetScales[pi] = 1;
      }

      for (let i = start; i < end; i++) {
        buffers.targetColorFactors[i] = 1;
      }

      // Middleman gap particles hover near but can't join
      if (group === 'middleman') {
        const [gapStart, gapEnd] = getParticleRange('gap', count);
        const gapCount = gapEnd - gapStart;
        const gapTargets = sampleFaceGroup(faceGroups.middleman, geometry, gapCount);
        ctx.gapHoverTargets = gapTargets;

        for (let i = 0; i < gapCount; i++) {
          const pi = gapStart + i;
          const i3 = pi * 3;
          const t3 = i * 3;
          const ox = gapTargets[t3]!;
          const oy = gapTargets[t3 + 1]!;
          const oz = gapTargets[t3 + 2]!;
          const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
          const hoverDist = 0.3 + Math.random() * 0.2;
          tp[i3] = ox + (ox / len) * hoverDist;
          tp[i3 + 1] = oy + (oy / len) * hoverDist;
          tp[i3 + 2] = oz + (oz / len) * hoverDist;
          buffers.targetScales[pi] = 0.5 + buffers.seeds[pi]! * 0.3;
          buffers.targetColorFactors[pi] = 1;
        }
      }
    },
    update(ctx, _subProgress, _delta, elapsed) {
      if (group === 'middleman') {
        const { buffers, count } = ctx;
        const [gapStart, gapEnd] = getParticleRange('gap', count);
        const { driftAmplitude } = ANIMATION;
        const tp = buffers.targetPositions;
        const ph = buffers.phases;

        for (let i = gapStart; i < gapEnd; i++) {
          const i3 = i * 3;
          const phase = ph[i]!;
          const drift = Math.sin(elapsed * 0.8 + phase) * driftAmplitude * 2;
          tp[i3] = tp[i3]! + drift * 0.01;
          tp[i3 + 1] = tp[i3 + 1]! + drift * 0.01;
        }
      }
    },
  };
}

const rebuildingBuyerHandler = createRebuildingHandler('buyer');
const rebuildingSellerHandler = createRebuildingHandler('seller');
const rebuildingMiddlemanHandler = createRebuildingHandler('middleman');

// ---------------------------------------------------------------------------
// REBUILT: settled, orbital rings appear
// ---------------------------------------------------------------------------

const rebuiltHandler: StateHandler = {
  enter(ctx) {
    const { buffers, count } = ctx;
    for (let i = 0; i < count; i++) {
      buffers.targetScales[i] = 1;
      buffers.targetColorFactors[i] = 1;
    }
  },
  update(ctx, _subProgress, _delta, elapsed) {
    const { buffers, count } = ctx;
    const { driftAmplitude, driftFrequency } = ANIMATION;
    const tp = buffers.targetPositions;
    const ph = buffers.phases;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = ph[i]!;
      const drift = Math.sin(elapsed * driftFrequency * 0.5 + phase) * driftAmplitude * 0.5;
      tp[i3] = tp[i3]! + drift * 0.1;
      tp[i3 + 1] = tp[i3 + 1]! + drift * 0.1;
    }
  },
};

// ---------------------------------------------------------------------------
// MORPHING: geometry changes, color transitions BLUE → WHITE
// ---------------------------------------------------------------------------

const morphingHandler: StateHandler = {
  enter(ctx) {
    const { buffers, count } = ctx;
    const morphTarget = sampleIcosahedronSurface(
      count,
      VAULT_GEOMETRY.radius * 1.1,
      VAULT_GEOMETRY.detail,
    );
    buffers.targetPositions.set(morphTarget.subarray(0, count * 3));
    for (let i = 0; i < count; i++) {
      buffers.targetScales[i] = 1;
    }
  },
  update(ctx, subProgress, _delta, elapsed) {
    const { buffers, count } = ctx;
    const ph = buffers.phases;
    for (let i = 0; i < count; i++) {
      buffers.targetColorFactors[i] = 1 - subProgress;
      buffers.targetScales[i] = 0.9 + Math.sin(elapsed * 2 + ph[i]!) * 0.1;
    }
  },
};

// ---------------------------------------------------------------------------
// PEACEFUL: slow rotation, gentle orbital drift, white particles
// ---------------------------------------------------------------------------

const peacefulHandler: StateHandler = {
  enter(ctx) {
    const { buffers, count, vaultSurfacePositions } = ctx;
    buffers.targetPositions.set(vaultSurfacePositions.subarray(0, count * 3));
    for (let i = 0; i < count; i++) {
      buffers.targetScales[i] = 1;
      buffers.targetColorFactors[i] = 0;
    }
  },
  update(ctx, _subProgress, _delta, elapsed) {
    const { buffers, count, vaultSurfacePositions } = ctx;
    const { peacefulRotationSpeed, driftAmplitude } = ANIMATION;
    const tp = buffers.targetPositions;
    const ph = buffers.phases;

    const cos = Math.cos(elapsed * peacefulRotationSpeed);
    const sin = Math.sin(elapsed * peacefulRotationSpeed);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = ph[i]!;
      const sx = vaultSurfacePositions[i3]!;
      const sy = vaultSurfacePositions[i3 + 1]!;
      const sz = vaultSurfacePositions[i3 + 2]!;

      const rx = sx * cos - sz * sin;
      const rz = sx * sin + sz * cos;

      const drift = Math.sin(elapsed * 0.3 + phase) * driftAmplitude;
      tp[i3] = rx + drift;
      tp[i3 + 1] = sy + drift * 0.5;
      tp[i3 + 2] = rz + drift * 0.3;
    }
  },
};

// ---------------------------------------------------------------------------
// Lookup table — O(1) dispatch, no branching in hot loop
// ---------------------------------------------------------------------------

export const STATE_HANDLERS: Record<VaultState, StateHandler> = {
  forming: formingHandler,
  complete: completeHandler,
  shattering: shatteringHandler,
  scattered: scatteredHandler,
  rebuilding_buyer: rebuildingBuyerHandler,
  rebuilding_seller: rebuildingSellerHandler,
  rebuilding_middleman: rebuildingMiddlemanHandler,
  rebuilt: rebuiltHandler,
  morphing: morphingHandler,
  peaceful: peacefulHandler,
};
