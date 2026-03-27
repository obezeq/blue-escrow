// ---------------------------------------------------------------------------
// Vault state machine handlers — Strategy Pattern
// Each handler sets TARGET positions/colors. The shared lerp loop in
// VaultParticles applies smooth interpolation every frame.
// ---------------------------------------------------------------------------

import type { IcosahedronGeometry } from 'three';
import type { VaultState } from '@/providers/ThreeProvider';
import { ANIMATION, COLORS, MIDDLEMAN_GAP_RATIO, VAULT_GEOMETRY } from '../config/vaultConfig';
import type { FaceGroups } from './geometry';
import {
  sampleIcosahedronSurface,
  sampleFaceGroup,
  generateRandomPositions,
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
  // Cached face-group target positions (computed on enter)
  buyerTargets: Float32Array;
  sellerTargets: Float32Array;
  middlemanTargets: Float32Array;
  gapHoverTargets: Float32Array;
}

// ---------------------------------------------------------------------------
// Handler interface
// ---------------------------------------------------------------------------

export interface StateHandler {
  /** Called once when transitioning INTO this state */
  enter(ctx: StateHandlerContext): void;
  /** Called every frame while in this state */
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
  const middlemanEnd = Math.floor(count * (1 - MIDDLEMAN_GAP_RATIO));

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
    for (let i = 0; i < count * 3; i++) {
      buffers.targetPositions[i] = vaultSurfacePositions[i];
    }
    for (let i = 0; i < count; i++) {
      buffers.targetScales[i] = 1;
      buffers.targetColorFactors[i] = 0; // white (on blue bg)
    }
  },
  update(_ctx, _subProgress, _delta, _elapsed) {
    // Lerp handled by shared loop — targets already set in enter
  },
};

// ---------------------------------------------------------------------------
// COMPLETE: hold shape, gentle noise drift
// ---------------------------------------------------------------------------

const completeHandler: StateHandler = {
  enter(ctx) {
    const { buffers, count, vaultSurfacePositions } = ctx;
    for (let i = 0; i < count * 3; i++) {
      buffers.targetPositions[i] = vaultSurfacePositions[i];
    }
    for (let i = 0; i < count; i++) {
      buffers.targetScales[i] = 1;
      buffers.targetColorFactors[i] = 0; // white
    }
  },
  update(ctx, _subProgress, _delta, elapsed) {
    const { buffers, count, vaultSurfacePositions } = ctx;
    const { driftAmplitude, driftFrequency } = ANIMATION;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = buffers.phases[i];
      const drift = Math.sin(elapsed * driftFrequency + phase) * driftAmplitude;
      buffers.targetPositions[i3] = vaultSurfacePositions[i3] + drift;
      buffers.targetPositions[i3 + 1] = vaultSurfacePositions[i3 + 1] + drift * 0.7;
      buffers.targetPositions[i3 + 2] = vaultSurfacePositions[i3 + 2] + drift * 0.5;
    }
  },
};

// ---------------------------------------------------------------------------
// SHATTERING: explode outward + danger flash, color WHITE → BLUE
// ---------------------------------------------------------------------------

const shatteringHandler: StateHandler = {
  enter(ctx) {
    const { buffers, count } = ctx;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Velocity = outward from center
      const px = buffers.positions[i3];
      const py = buffers.positions[i3 + 1];
      const pz = buffers.positions[i3 + 2];
      const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
      const force = ANIMATION.shatterForce * (0.5 + buffers.seeds[i]);
      buffers.velocities[i3] = (px / len) * force;
      buffers.velocities[i3 + 1] = (py / len) * force;
      buffers.velocities[i3 + 2] = (pz / len) * force;
    }
  },
  update(ctx, subProgress, delta, _elapsed) {
    const { buffers, count } = ctx;
    const damping = 0.96;

    // Brief #FF4455 flash at start, then transition to blue
    const flashEnd = ANIMATION.shatterDangerFlashDuration;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Apply velocity with damping
      buffers.velocities[i3] *= damping;
      buffers.velocities[i3 + 1] *= damping;
      buffers.velocities[i3 + 2] *= damping;

      buffers.targetPositions[i3] = buffers.positions[i3] + buffers.velocities[i3] * delta;
      buffers.targetPositions[i3 + 1] = buffers.positions[i3 + 1] + buffers.velocities[i3 + 1] * delta;
      buffers.targetPositions[i3 + 2] = buffers.positions[i3 + 2] + buffers.velocities[i3 + 2] * delta;

      // Color: flash red early, then transition white → blue
      if (subProgress < flashEnd) {
        // -1 signals "danger" color to the color composer
        buffers.targetColorFactors[i] = -1;
      } else {
        buffers.targetColorFactors[i] = (subProgress - flashEnd) / (1 - flashEnd);
      }

      buffers.targetScales[i] = 0.8 + buffers.seeds[i] * 0.4;
    }
  },
};

// ---------------------------------------------------------------------------
// SCATTERED: brownian chaos, particles on white bg (blue color)
// ---------------------------------------------------------------------------

const scatteredHandler: StateHandler = {
  enter(ctx) {
    const { buffers, count } = ctx;
    for (let i = 0; i < count; i++) {
      buffers.targetColorFactors[i] = 1; // blue (on white bg)
      buffers.targetScales[i] = 0.6 + buffers.seeds[i] * 0.4;
    }
  },
  update(ctx, _subProgress, delta, elapsed) {
    const { buffers, count } = ctx;
    const { brownianForce } = ANIMATION;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = buffers.phases[i];
      buffers.targetPositions[i3] += Math.sin(elapsed * 1.3 + phase) * brownianForce * delta;
      buffers.targetPositions[i3 + 1] += Math.cos(elapsed * 0.9 + phase * 2) * brownianForce * delta;
      buffers.targetPositions[i3 + 2] += Math.sin(elapsed * 1.1 + phase * 3) * brownianForce * delta;
    }
  },
};

// ---------------------------------------------------------------------------
// REBUILDING: particles converge to assigned face group positions
// Three sub-phases: buyer, seller, middleman (with gap)
// ---------------------------------------------------------------------------

function createRebuildingHandler(
  group: 'buyer' | 'seller' | 'middleman',
): StateHandler {
  return {
    enter(ctx) {
      const { buffers, count, faceGroups, geometry } = ctx;
      const [start, end] = getParticleRange(group, count);
      const groupCount = end - start;

      // Compute target positions for this group's particles
      const targets = sampleFaceGroup(faceGroups[group], geometry, groupCount);

      if (group === 'buyer') {
        ctx.buyerTargets = targets;
      } else if (group === 'seller') {
        ctx.sellerTargets = targets;
      } else {
        ctx.middlemanTargets = targets;
      }

      // Set targets for this group's particles
      for (let i = 0; i < groupCount; i++) {
        const pi = start + i;
        const i3 = pi * 3;
        const t3 = i * 3;
        buffers.targetPositions[i3] = targets[t3];
        buffers.targetPositions[i3 + 1] = targets[t3 + 1];
        buffers.targetPositions[i3 + 2] = targets[t3 + 2];
        buffers.targetScales[pi] = 1;
      }

      // Color factor by group
      const colorMap = { buyer: 1, seller: 1, middleman: 1 };
      for (let i = start; i < end; i++) {
        buffers.targetColorFactors[i] = colorMap[group];
      }

      // Handle middleman gap particles — hover near but can't join
      if (group === 'middleman') {
        const [gapStart, gapEnd] = getParticleRange('gap', count);
        const gapCount = gapEnd - gapStart;
        const gapTargets = sampleFaceGroup(faceGroups.middleman, geometry, gapCount);

        ctx.gapHoverTargets = gapTargets;

        for (let i = 0; i < gapCount; i++) {
          const pi = gapStart + i;
          const i3 = pi * 3;
          const t3 = i * 3;
          // Offset outward from the surface — they hover nearby but can't land
          const ox = gapTargets[t3];
          const oy = gapTargets[t3 + 1];
          const oz = gapTargets[t3 + 2];
          const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
          const hoverDist = 0.3 + Math.random() * 0.2;
          buffers.targetPositions[i3] = ox + (ox / len) * hoverDist;
          buffers.targetPositions[i3 + 1] = oy + (oy / len) * hoverDist;
          buffers.targetPositions[i3 + 2] = oz + (oz / len) * hoverDist;
          buffers.targetScales[pi] = 0.5 + buffers.seeds[pi] * 0.3;
          buffers.targetColorFactors[pi] = 1; // blue (middleman color handled in color composer)
        }
      }
    },
    update(ctx, _subProgress, _delta, elapsed) {
      // Gap particles drift slightly while hovering
      if (group === 'middleman') {
        const { buffers, count } = ctx;
        const [gapStart, gapEnd] = getParticleRange('gap', count);
        const { driftAmplitude } = ANIMATION;

        for (let i = gapStart; i < gapEnd; i++) {
          const i3 = i * 3;
          const phase = buffers.phases[i];
          const drift = Math.sin(elapsed * 0.8 + phase) * driftAmplitude * 2;
          buffers.targetPositions[i3] += drift * 0.01;
          buffers.targetPositions[i3 + 1] += drift * 0.01;
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
      buffers.targetColorFactors[i] = 1; // blue (on white bg)
    }
  },
  update(ctx, _subProgress, _delta, elapsed) {
    const { buffers, count } = ctx;
    const { driftAmplitude, driftFrequency } = ANIMATION;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = buffers.phases[i];
      const drift = Math.sin(elapsed * driftFrequency * 0.5 + phase) * driftAmplitude * 0.5;
      buffers.targetPositions[i3] += drift * 0.1;
      buffers.targetPositions[i3 + 1] += drift * 0.1;
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
    for (let i = 0; i < count * 3; i++) {
      buffers.targetPositions[i] = morphTarget[i];
    }
    for (let i = 0; i < count; i++) {
      buffers.targetScales[i] = 1;
    }
  },
  update(ctx, subProgress, _delta, elapsed) {
    const { buffers, count } = ctx;
    // Color transitions from blue (1) to white (0) over the morph
    for (let i = 0; i < count; i++) {
      buffers.targetColorFactors[i] = 1 - subProgress;

      // Gentle pulsing during morph
      const phase = buffers.phases[i];
      buffers.targetScales[i] = 0.9 + Math.sin(elapsed * 2 + phase) * 0.1;
    }
  },
};

// ---------------------------------------------------------------------------
// PEACEFUL: slow rotation, gentle orbital drift, white particles
// ---------------------------------------------------------------------------

const peacefulHandler: StateHandler = {
  enter(ctx) {
    const { buffers, count, vaultSurfacePositions } = ctx;
    for (let i = 0; i < count * 3; i++) {
      buffers.targetPositions[i] = vaultSurfacePositions[i];
    }
    for (let i = 0; i < count; i++) {
      buffers.targetScales[i] = 1;
      buffers.targetColorFactors[i] = 0; // white (on blue bg)
    }
  },
  update(ctx, _subProgress, _delta, elapsed) {
    const { buffers, count, vaultSurfacePositions } = ctx;
    const { peacefulRotationSpeed, driftAmplitude } = ANIMATION;

    const cos = Math.cos(elapsed * peacefulRotationSpeed);
    const sin = Math.sin(elapsed * peacefulRotationSpeed);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = buffers.phases[i];
      const sx = vaultSurfacePositions[i3];
      const sy = vaultSurfacePositions[i3 + 1];
      const sz = vaultSurfacePositions[i3 + 2];

      // Rotate around Y axis
      const rx = sx * cos - sz * sin;
      const rz = sx * sin + sz * cos;

      // Add gentle orbital drift
      const drift = Math.sin(elapsed * 0.3 + phase) * driftAmplitude;
      buffers.targetPositions[i3] = rx + drift;
      buffers.targetPositions[i3 + 1] = sy + drift * 0.5;
      buffers.targetPositions[i3 + 2] = rz + drift * 0.3;
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
