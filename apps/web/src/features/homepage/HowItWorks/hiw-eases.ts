// ---------------------------------------------------------------------------
// HIW custom ease registry — registered once at module import time.
//
// These names are referenced as string eases throughout the HIW animations
// timeline (see HowItWorksAnimations.tsx). Registering by name keeps the
// string API throughout the timeline while still letting us author bespoke
// curves for money tween, packet flight, halo flash, etc. No "back.out"
// anywhere — tuned to feel deliberate, not bouncy.
//
// Coordination contract (PRD §6): exported keys must match
// HIW_EASES = { enter, exit, snap, money, packet, halo }.
//
// Guards against HMR double-registration — CustomEase.create throws if the
// same name is registered twice, which otherwise crashes the client
// component on fast-refresh during dev.
// ---------------------------------------------------------------------------

import { CustomEase } from '@/animations/config/gsap-register';

export const HIW_EASE_NAMES = {
  enter: 'hiw-enter',
  exit: 'hiw-exit',
  snap: 'hiw-snap',
  money: 'hiw-money',
  packet: 'hiw-packet',
  halo: 'hiw-halo',
} as const;

export type HiwEaseName = (typeof HIW_EASE_NAMES)[keyof typeof HIW_EASE_NAMES];

const HIW_EASE_CURVES: Record<HiwEaseName, string> = {
  [HIW_EASE_NAMES.enter]: 'M0,0 C0.16,1 0.3,1 1,1',
  [HIW_EASE_NAMES.exit]: 'M0,0 C0.7,0 0.84,0 1,1',
  [HIW_EASE_NAMES.snap]: 'M0,0 C0.25,1 0.1,1 1,1',
  [HIW_EASE_NAMES.money]:
    'M0,0 C0.1,0.4 0.2,0.9 0.5,0.98 C0.7,1 0.85,1 1,1',
  [HIW_EASE_NAMES.packet]: 'M0,0 C0.2,0 0.1,1 1,1',
  [HIW_EASE_NAMES.halo]: 'M0,0 C0.3,1 0.5,1 1,0',
};

let registered = false;

export function registerHiwEases(): void {
  if (registered) return;
  for (const [name, path] of Object.entries(HIW_EASE_CURVES)) {
    // CustomEase.get throws/returns undefined if missing depending on version;
    // this defensive check keeps HMR + SSR warm-reloads from double-creating.
    try {
      CustomEase.create(name, path);
    } catch {
      // Already registered (HMR). Swallow — the existing curve is the same.
    }
  }
  registered = true;
}
