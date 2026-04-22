// Single source of truth for the intro preloader completion signal.
// HeroAnimations subscribes here instead of hard-coding a delay that must
// stay in sync with the Preloader's GSAP timeline.
//
// The flag lives on <html> via `data-preloader="done"` — this handles the
// race where the HeroAnimations effect fires AFTER the Preloader has
// already completed (rare, but possible if dynamic import + hydration
// schedule things out of order). Subscribers that mount mid-flight check
// the attribute first and fire immediately instead of waiting for an
// event that already fired.

export const PRELOADER_DONE_EVENT = 'preloader:done' as const;

export function isPreloaderDone(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.preloader === 'done';
}

export function markPreloaderDone(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.preloader = 'done';
  document.dispatchEvent(new CustomEvent(PRELOADER_DONE_EVENT));
}

export function onPreloaderDone(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  if (isPreloaderDone()) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  document.addEventListener(PRELOADER_DONE_EVENT, handler, { once: true });
  return () => document.removeEventListener(PRELOADER_DONE_EVENT, handler);
}
