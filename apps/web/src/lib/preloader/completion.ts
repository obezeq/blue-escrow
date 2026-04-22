// Single source of truth for the intro preloader completion signal.
// HeroAnimations subscribes here instead of hard-coding a delay that must
// stay in sync with the Preloader's GSAP timeline.

export const PRELOADER_DONE_EVENT = 'preloader:done' as const;
export const PRELOADER_SESSION_KEY = 'preloader:done' as const;

export function isPreloaderDone(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.dataset.preloader === 'done') return true;
  try {
    return sessionStorage.getItem(PRELOADER_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markPreloaderDone(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.preloader = 'done';
  try {
    sessionStorage.setItem(PRELOADER_SESSION_KEY, '1');
  } catch {
    // Private mode or storage quota — the data attribute still signals completion.
  }
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
