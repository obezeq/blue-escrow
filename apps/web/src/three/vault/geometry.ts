// ---------------------------------------------------------------------------
// Icosahedron surface sampling and face grouping — pure functions, no React
// Used by VaultParticles to compute target positions for each vault state
// ---------------------------------------------------------------------------

import { IcosahedronGeometry, Vector3 } from 'three';
import { _vec3, _vec3b, _vec3c } from './mathPool';

/**
 * Sample random points on an icosahedron surface using barycentric coordinates.
 * Returns a Float32Array of xyz positions (count * 3).
 */
export function sampleIcosahedronSurface(
  count: number,
  radius: number,
  detail: number,
): Float32Array {
  const geo = new IcosahedronGeometry(radius, detail);
  const posAttr = geo.getAttribute('position');
  const index = geo.getIndex();
  const positions = new Float32Array(count * 3);

  const faceCount = index ? index.count / 3 : posAttr.count / 3;

  for (let i = 0; i < count; i++) {
    const faceIdx = Math.floor(Math.random() * faceCount);
    sampleFace(posAttr, index, faceIdx, positions, i * 3);
  }

  geo.dispose();
  return positions;
}

/**
 * Sample a random point on a specific triangle face using barycentric coords.
 * Writes xyz to `out` at `offset`.
 */
function sampleFace(
  posAttr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  index: THREE.BufferAttribute | null,
  faceIdx: number,
  out: Float32Array,
  offset: number,
): void {
  const i0 = index ? index.getX(faceIdx * 3) : faceIdx * 3;
  const i1 = index ? index.getX(faceIdx * 3 + 1) : faceIdx * 3 + 1;
  const i2 = index ? index.getX(faceIdx * 3 + 2) : faceIdx * 3 + 2;

  _vec3.fromBufferAttribute(posAttr, i0);
  _vec3b.fromBufferAttribute(posAttr, i1);
  _vec3c.fromBufferAttribute(posAttr, i2);

  // Random barycentric coordinates
  let u = Math.random();
  let v = Math.random();
  if (u + v > 1) {
    u = 1 - u;
    v = 1 - v;
  }
  const w = 1 - u - v;

  out[offset] = _vec3.x * w + _vec3b.x * u + _vec3c.x * v;
  out[offset + 1] = _vec3.y * w + _vec3b.y * u + _vec3c.y * v;
  out[offset + 2] = _vec3.z * w + _vec3b.z * u + _vec3c.z * v;
}

/**
 * Groups icosahedron faces into buyer / seller / middleman / gap regions
 * by azimuthal angle of each face centroid.
 */
export interface FaceGroups {
  buyer: number[];
  seller: number[];
  middleman: number[];
  gap: number[];
}

export function groupFacesByRegion(
  radius: number,
  detail: number,
): { groups: FaceGroups; geometry: IcosahedronGeometry } {
  const geo = new IcosahedronGeometry(radius, detail);
  const posAttr = geo.getAttribute('position');
  const index = geo.getIndex();
  const faceCount = index ? index.count / 3 : posAttr.count / 3;

  const centroids: { faceIdx: number; angle: number }[] = [];

  for (let f = 0; f < faceCount; f++) {
    const i0 = index ? index.getX(f * 3) : f * 3;
    const i1 = index ? index.getX(f * 3 + 1) : f * 3 + 1;
    const i2 = index ? index.getX(f * 3 + 2) : f * 3 + 2;

    const cx = (posAttr.getX(i0) + posAttr.getX(i1) + posAttr.getX(i2)) / 3;
    const cy = (posAttr.getY(i0) + posAttr.getY(i1) + posAttr.getY(i2)) / 3;
    const cz = (posAttr.getZ(i0) + posAttr.getZ(i1) + posAttr.getZ(i2)) / 3;

    const angle = Math.atan2(cz, cx);
    centroids.push({ faceIdx: f, angle });
  }

  // Sort by angle and partition: 33% buyer, 33% seller, 20% middleman, 14% gap
  centroids.sort((a, b) => a.angle - b.angle);

  const total = centroids.length;
  const buyerEnd = Math.floor(total * 0.33);
  const sellerEnd = Math.floor(total * 0.66);
  const middlemanEnd = Math.floor(total * 0.86);

  const groups: FaceGroups = {
    buyer: centroids.slice(0, buyerEnd).map((c) => c.faceIdx),
    seller: centroids.slice(buyerEnd, sellerEnd).map((c) => c.faceIdx),
    middleman: centroids.slice(sellerEnd, middlemanEnd).map((c) => c.faceIdx),
    gap: centroids.slice(middlemanEnd).map((c) => c.faceIdx),
  };

  return { groups, geometry: geo };
}

/**
 * Sample random points from a specific set of faces.
 * Returns Float32Array(count * 3).
 */
export function sampleFaceGroup(
  faceIndices: number[],
  geometry: IcosahedronGeometry,
  count: number,
): Float32Array {
  const posAttr = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const faceIdx = faceIndices[Math.floor(Math.random() * faceIndices.length)]!;
    sampleFace(posAttr, index, faceIdx, positions, i * 3);
  }

  return positions;
}

/**
 * Generate random positions in a sphere of given radius.
 */
export function generateRandomPositions(
  count: number,
  spread: number,
): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = spread * Math.cbrt(Math.random());
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

// Type import for BufferAttribute used in sampleFace
import type * as THREE from 'three';
