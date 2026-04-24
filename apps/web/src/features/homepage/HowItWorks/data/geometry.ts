import type { ActorId } from './types';

export const SVG_VIEW_BOX = { width: 1200, height: 720 };

export const ACTOR_POSITIONS: Record<ActorId, { x: number; y: number }> = {
  client: { x: 180, y: 420 },
  mid: { x: 600, y: 120 },
  seller: { x: 1020, y: 420 },
};

export const CORE_POSITION = { x: 600, y: 380 };
