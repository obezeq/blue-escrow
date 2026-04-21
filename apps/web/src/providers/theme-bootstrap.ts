// Shared theme constants + the inline script used before React hydrates.
// No 'use client' directive so both server layouts and client providers
// can import from here without pulling the whole module into a client bundle.

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'be-theme';
export const DEFAULT_THEME: Theme = 'dark';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

// Inline script body injected into <head> to set html[data-theme] before
// the first paint. Order of precedence:
//   1. localStorage['be-theme'] if previously set
//   2. window.matchMedia('(prefers-color-scheme: light)')
//   3. 'dark' (invariant default)
//
// Hardcoded string literal — no user input and no interpolation, so no XSS
// surface. Kept on one line for minimal HTML payload.
export const THEME_INIT_SCRIPT =
  "(function(){try{var s=localStorage.getItem('be-theme');if(s==='dark'||s==='light'){document.documentElement.dataset.theme=s;return}}catch(e){}var l=false;try{l=window.matchMedia('(prefers-color-scheme: light)').matches}catch(e){}document.documentElement.dataset.theme=l?'light':'dark'})();";
