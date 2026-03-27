'use client';

// ---------------------------------------------------------------------------
// BloomEffect — TEMPORARILY DISABLED
//
// TODO(session-11): Re-enable bloom. @react-three/postprocessing crashes
// with circular JSON serialization in React 19 / R3F 9. The error occurs
// inside R3F's reconciler before React error boundaries can catch it.
// Options for session 11:
//   1. Upgrade @react-three/postprocessing to a fixed version
//   2. Use Three.js UnrealBloomPass directly (bypass R3F postprocessing)
//   3. Custom shader-based glow on particle material
// ---------------------------------------------------------------------------

interface BloomEffectProps {
  enabled: boolean;
}

export function BloomEffect(_props: BloomEffectProps) {
  return null;
}
