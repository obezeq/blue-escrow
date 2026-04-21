// ---------------------------------------------------------------------------
// Pre-allocated math objects — module-level singletons for zero GC in useFrame
// NEVER create new Vector3/Color/Matrix4 inside a per-frame loop
// ---------------------------------------------------------------------------

import { Vector3, Color, Matrix4, Quaternion, Euler } from 'three';

export const _vec3 = new Vector3();
export const _vec3b = new Vector3();
export const _vec3c = new Vector3();
export const _color = new Color();
export const _colorB = new Color();
export const _mat4 = new Matrix4();
export const _quat = new Quaternion();
export const _euler = new Euler();
