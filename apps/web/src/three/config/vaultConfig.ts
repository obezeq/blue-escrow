// ---------------------------------------------------------------------------
// Vault configuration — pure constants, no React
// All colors in LINEAR color space (Three.js default)
// ---------------------------------------------------------------------------

import type { VaultState, SectionBg } from '@/providers/ThreeProvider';

// --- Particle counts per device tier ---
export const PARTICLE_COUNT = {
  desktop: 12_000,
  tablet: 6_000,
  mobile: 3_000,
} as const;

// --- Vault geometry ---
export const VAULT_GEOMETRY = {
  type: 'icosahedron' as const,
  radius: 2.5,
  detail: 3,
};

// --- Camera ---
export const CAMERA = {
  fov: 45,
  near: 0.1,
  far: 100,
  position: [0, 0, 8] as const,
};

// --- Particle appearance ---
export const PARTICLE = {
  radius: 0.015,
  widthSegments: 6,
  heightSegments: 6,
};

// --- Colors (linear sRGB for Three.js) ---
// #FFFFFF → (1, 1, 1), #0066FF → (0, 0.4, 1) in linear approx
// #FF4455 → (1, 0.267, 0.333), #999999 → (0.6, 0.6, 0.6), #33AAFF → (0.2, 0.667, 1)
export const COLORS = {
  particleOnBlue: { r: 1, g: 1, b: 1 },
  particleOnWhite: { r: 0, g: 0.4, b: 1 },
  danger: { r: 1, g: 0.267, b: 0.333 },
  middleman: { r: 0.6, g: 0.6, b: 0.6 },
  seller: { r: 0.2, g: 0.667, b: 1 },
  buyer: { r: 0, g: 0.4, b: 1 },
} as const;

// --- Bloom (UnrealBloomPass) ---
export const BLOOM = {
  intensity: 1.2,
  threshold: 0.7,
  smoothing: 0.8,
} as const;

// --- Lighting ---
export const LIGHTING = {
  ambient: { intensity: 0.4 },
  directional: { intensity: 0.8, position: [5, 5, 5] as const },
  point: { intensity: 0.6 },
} as const;

// --- Scroll thresholds — maps scroll progress (0-1) to vault state ---
export interface ScrollSection {
  state: VaultState;
  bg: SectionBg;
  start: number;
  end: number;
  bloomEnabled: boolean;
}

// Thresholds calibrated for ~2450vh total scroll (including pinned sections):
// CinematicIntro +=300%, TheProblem +=200vh, TheSolution +=250vh,
// HowItWorks +=500vh, TheFlow +=300vh
export const SCROLL_THRESHOLDS: ScrollSection[] = [
  // ACT 1 — TRUST IS BORN: CinematicIntro (blue, 0-0.16) + Hero (blue, 0.16-0.20)
  { state: 'forming',              bg: 'blue',  start: 0.00, end: 0.08, bloomEnabled: true  },
  { state: 'complete',             bg: 'blue',  start: 0.08, end: 0.20, bloomEnabled: true  },

  // ACT 2 — TRUST IS BROKEN: TheProblem (white, 0.20-0.33)
  { state: 'shattering',           bg: 'white', start: 0.20, end: 0.28, bloomEnabled: false },
  { state: 'scattered',            bg: 'white', start: 0.28, end: 0.33, bloomEnabled: false },

  // ACT 3 — TRUST IS ENGINEERED: TheSolution (white, 0.33-0.47)
  { state: 'rebuilding_buyer',     bg: 'white', start: 0.33, end: 0.38, bloomEnabled: false },
  { state: 'rebuilding_seller',    bg: 'white', start: 0.38, end: 0.42, bloomEnabled: false },
  { state: 'rebuilding_middleman', bg: 'white', start: 0.42, end: 0.46, bloomEnabled: false },
  { state: 'rebuilt',              bg: 'white', start: 0.46, end: 0.47, bloomEnabled: false },

  // ACT 4 — HOW IT WORKS: HowItWorks (blue, 0.47-0.72)
  { state: 'morphing',             bg: 'blue',  start: 0.47, end: 0.72, bloomEnabled: true  },

  // ACT 5 — THE PROOF: TheFlow (white, 0.72-0.88) + TrustLayer (white, 0.88-0.92)
  { state: 'rebuilt',              bg: 'white', start: 0.72, end: 0.92, bloomEnabled: false },

  // ACT 6 — THE INVITATION: FeeSection (blue, 0.92-0.95) + CtaSection (blue, 0.95-1.0)
  { state: 'peaceful',             bg: 'blue',  start: 0.92, end: 1.00, bloomEnabled: true  },
];

// --- Color transition zones ---
// At each bg boundary, particle color lerps over this scroll width.
// Affects wireframe, lights, and orbital rings (NOT particles — those use
// colorFactors from state handlers). Width of 0.03 ≈ ~73vh smooth lerp.
export const COLOR_TRANSITION_WIDTH = 0.03;

// Pre-computed transition boundaries (4 blue↔white crossings in the page)
export const COLOR_TRANSITIONS = [
  { at: 0.20, from: COLORS.particleOnBlue, to: COLORS.particleOnWhite },   // Hero → TheProblem
  { at: 0.47, from: COLORS.particleOnWhite, to: COLORS.particleOnBlue },   // TheSolution → HowItWorks
  { at: 0.72, from: COLORS.particleOnBlue, to: COLORS.particleOnWhite },   // HowItWorks → TheFlow
  { at: 0.92, from: COLORS.particleOnWhite, to: COLORS.particleOnBlue },   // TrustLayer → FeeSection
] as const;

// --- Animation ---
export const ANIMATION = {
  lerpSpeed: 0.08,
  colorLerpSpeed: 0.03,
  colorLerpVariation: 0.02,
  scrollSmoothingFactor: 10,
  mouseParallaxDegrees: 3,
  mouseParallaxLerp: 0.05,
  peacefulRotationSpeed: 0.1,
  driftAmplitude: 0.02,
  driftFrequency: 0.5,
  shatterForce: 3.0,
  shatterDangerFlashDuration: 0.15,
  brownianForce: 0.3,
} as const;

// --- Orbital rings ---
export const ORBITAL_RINGS = {
  buyer:     { radius: 3.2, tube: 0.008, color: COLORS.buyer },
  seller:    { radius: 3.5, tube: 0.008, color: COLORS.seller },
  middleman: { radius: 3.8, tube: 0.008, color: COLORS.middleman, dashSize: 0.3, gapSize: 0.15 },
} as const;

// --- Middleman gap ---
export const MIDDLEMAN_GAP_RATIO = 0.15;
