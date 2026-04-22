// ---------------------------------------------------------------------------
// Problem section custom-ease registry — registered once at module import
// time via registerProblemEases(). Called from TheProblemAnimations.tsx
// inside the useGSAP callback so HMR/strict-mode double-mounts don't crash
// on CustomEase.create throwing for duplicate names.
//
// Curves tuned for "The Fall + velocity" choreography:
//   - fall       drop with overshoot for chars of "a stranger too"
//   - strike     LTR scaleX trace for the red strikethrough (--strike-scale)
//   - settle     micro-settle post-land for other lines
//   - monoTick   snappy type-on for the eyebrow "THE PROBLEM"
//
// Coordination contract: exported keys must match PROBLEM_EASE_NAMES.
// ---------------------------------------------------------------------------

import { CustomEase } from '@/animations/config/gsap-register';

export const PROBLEM_EASE_NAMES = {
  fall: 'problem-fall',
  strike: 'problem-strike',
  settle: 'problem-settle',
  monoTick: 'problem-mono-tick',
} as const;

export type ProblemEaseName =
  (typeof PROBLEM_EASE_NAMES)[keyof typeof PROBLEM_EASE_NAMES];

const PROBLEM_EASE_CURVES: Record<ProblemEaseName, string> = {
  [PROBLEM_EASE_NAMES.fall]:
    'M0,0 C0.2,0 0.1,1.12 0.55,0.98 C0.72,0.94 0.88,1.02 1,1',
  [PROBLEM_EASE_NAMES.strike]: 'M0,0 C0.19,1 0.22,1 1,1',
  [PROBLEM_EASE_NAMES.settle]: 'M0,0 C0.6,0 0.2,1 1,1',
  [PROBLEM_EASE_NAMES.monoTick]: 'M0,0 C0.2,1 0.3,1 1,1',
};

let registered = false;

export function registerProblemEases(): void {
  if (registered) return;
  for (const [name, path] of Object.entries(PROBLEM_EASE_CURVES)) {
    try {
      CustomEase.create(name, path);
    } catch {
      // Already registered (HMR). The curve is identical — safe to swallow.
    }
  }
  registered = true;
}
