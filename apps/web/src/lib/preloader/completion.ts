// Single source of truth for the intro preloader completion signal.
// HeroAnimations subscribes here instead of hard-coding a delay that must
// stay in sync with the Preloader's GSAP timeline.
//
// The flag lives on <html> via `data-preloader`, which progresses roughly
// through `active → mounted → exiting → done` as the intro timeline runs.
// Two signals are exposed:
//   - `preloader:exit-start` — fires the moment the preloader begins its
//     exit animation (data-preloader transitions to `exiting`). Downstream
//     animations can start their intro in parallel with the preloader
//     outro to eliminate the dead-frame gap between them.
//   - `preloader:done` — fires when the preloader has fully finished
//     (data-preloader === `done`). Used as a fallback for subscribers
//     that only care about the final completion signal.
//
// Both signals handle the race where a subscriber mounts AFTER the event
// has already fired (rare, but possible if dynamic import + hydration
// schedule things out of order). Subscribers that mount mid-flight check
// the attribute first and fire immediately instead of waiting for an
// event that already fired.

export const PRELOADER_DONE_EVENT = 'preloader:done' as const;
export const PRELOADER_EXIT_START_EVENT = 'preloader:exit-start' as const;

export function isPreloaderDone(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.preloader === 'done';
}

export function isPreloaderExiting(): boolean {
  if (typeof document === 'undefined') return false;
  const state = document.documentElement.dataset.preloader;
  return state === 'exiting' || state === 'done';
}

export function markPreloaderDone(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.preloader = 'done';
  document.dispatchEvent(new CustomEvent(PRELOADER_DONE_EVENT));
}

export function markPreloaderExitStart(): void {
  if (typeof document === 'undefined') return;
  const state = document.documentElement.dataset.preloader;
  if (state === 'exiting' || state === 'done') return;
  document.documentElement.dataset.preloader = 'exiting';
  document.dispatchEvent(new CustomEvent(PRELOADER_EXIT_START_EVENT));
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

export function onPreloaderExitStart(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  if (isPreloaderExiting() || isPreloaderDone()) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  document.addEventListener(PRELOADER_EXIT_START_EVENT, handler, { once: true });
  return () => document.removeEventListener(PRELOADER_EXIT_START_EVENT, handler);
}
