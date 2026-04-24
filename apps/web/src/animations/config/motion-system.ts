/**
 * Motion System — shared GSAP defaults, helpers, and policies.
 *
 * Single source of truth for:
 *  - ScrollTrigger safety defaults (so every `scrub:` config picks up
 *    `invalidateOnRefresh`, `fastScrollEnd`, and `anticipatePin` without
 *    each call site re-asserting them).
 *  - Debounced `ScrollTrigger.refresh()` so sections whose DOM mutates
 *    (Faq panels, dynamic loads) don't storm the refresh pipeline.
 *  - Plugin registration policy (see PLUGIN_REGISTRATION_POLICY below).
 *
 * Usage:
 *   import { gsap, SCRUB_DEFAULTS_SAFE, scheduleRefresh } from '@/animations/config/motion-system';
 *
 *   gsap.to(title, {
 *     yPercent: -20,
 *     scrollTrigger: { trigger, start: 'top top', end: 'bottom top', scrub: 0.6, ...SCRUB_DEFAULTS_SAFE },
 *   });
 */
import { gsap, ScrollTrigger } from './gsap-register';

export { gsap, ScrollTrigger };

/**
 * Safe defaults to spread into ANY `scrollTrigger: { scrub: ... }` config.
 *
 * - `invalidateOnRefresh: true` — ScrollTrigger re-measures start/end on
 *   `ScrollTrigger.refresh()`; without this, cached values drift when
 *   downstream DOM changes page height (FAQ panels, dynamic images).
 * - `fastScrollEnd: true` — on fast flick/touch deceleration, the tween
 *   snaps instead of continuing to chase; prevents mobile jitter.
 * - `anticipatePin: 1` — if the trigger will pin, reserves space early so
 *   the pin transition isn't visibly abrupt.
 */
export const SCRUB_DEFAULTS_SAFE = {
  invalidateOnRefresh: true,
  fastScrollEnd: true,
  anticipatePin: 1,
} as const;

/**
 * Debounced `ScrollTrigger.refresh()`.
 *
 * Multiple callers within `delayMs` collapse to a single refresh after the
 * trailing edge. The first call arms a `setTimeout`; subsequent calls reset
 * the timer. Wrapped in `requestAnimationFrame` so it runs after the paint
 * that triggered the refresh (letting the new layout settle first).
 *
 * Intended callers: MutationObservers on accordion-style content, imperative
 * open/close handlers that change page height, image `load` handlers.
 */
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshRaf: number | null = null;

export function scheduleRefresh(delayMs = 200): void {
  if (typeof window === 'undefined') return;

  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  if (refreshRaf) {
    cancelAnimationFrame(refreshRaf);
    refreshRaf = null;
  }

  refreshRaf = requestAnimationFrame(() => {
    refreshRaf = null;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      ScrollTrigger.refresh();
    }, delayMs);
  });
}

/**
 * Plugin registration policy — document only (no runtime effect).
 *
 * GLOBAL (registered in `gsap-register.ts`, ship on every route):
 *   - ScrollTrigger  — used in every major section
 *   - SplitText      — Hero, TheProblem, CtaSection, Receipts
 *   - CustomEase     — Hero letterPop, shared motion design tokens
 *   - useGSAP (hook) — every animation component
 *
 * INLINE (register inside the consumer's matchMedia branch or useGSAP
 *         callback; shipped only with the feature's chunk):
 *   - MotionPathPlugin — HowItWorks packet Bézier only
 *   - ScrollToPlugin   — removed; use `lenis.scrollTo()` instead
 *   - Flip             — not yet used; inline-register when added
 *   - Observer         — inline-register when added
 *
 * Inline registration pattern:
 *   const { MotionPathPlugin } = await import('gsap/MotionPathPlugin');
 *   gsap.registerPlugin(MotionPathPlugin);
 */
export const PLUGIN_REGISTRATION_POLICY = 'See motion-system.ts docstring.' as const;
