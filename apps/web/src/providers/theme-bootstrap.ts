// Shared theme constants + the inline script used before React hydrates.
// No 'use client' directive so both server layouts and client providers
// can import from here without pulling the whole module into a client bundle.

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'be-theme';
export const THEME_COOKIE_NAME = 'be-theme';
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const DEFAULT_THEME: Theme = 'dark';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

// Parse a cookie value into a narrowed Theme. Used server-side by the root
// layout (reads `be-theme` via `cookies()`) so SSR can render the correct
// `data-theme` attribute and ThemeProvider state from the very first byte,
// eliminating the ThemeToggle hydration mismatch.
export function parseThemeCookie(raw: string | undefined | null): Theme | null {
  return isTheme(raw) ? raw : null;
}

// Inline script body injected into <head> to align html[data-theme] with the
// user's preference before the first paint AND persist a cookie so the next
// SSR render ships the correct attribute. Order of precedence:
//   1. document.cookie['be-theme']  (fastest path, matches server read)
//   2. localStorage['be-theme']     (back-compat for pre-cookie visitors)
//   3. window.matchMedia('(prefers-color-scheme: light)')
//   4. 'dark' (invariant default)
// When the script resolves via (2) or (3) it writes the cookie so the next
// request ships the matching `data-theme` from SSR and avoids mismatches
// on returning visits.
//
// Hardcoded string literal — no user input and no interpolation, so no XSS
// surface. Minified on one line for minimal HTML payload.
export const THEME_INIT_SCRIPT =
  "(function(){var d=document.documentElement;var c=document.cookie.replace(/(?:(?:^|.*;\\s*)be-theme\\s*\\=\\s*([^;]*).*$)|^.*$/,'$1');if(c==='dark'||c==='light'){d.dataset.theme=c;return}try{var s=localStorage.getItem('be-theme');if(s==='dark'||s==='light'){d.dataset.theme=s;document.cookie='be-theme='+s+'; Max-Age=31536000; Path=/; SameSite=Lax';return}}catch(e){}var l=false;try{l=window.matchMedia('(prefers-color-scheme: light)').matches}catch(e){}var t=l?'light':'dark';d.dataset.theme=t;try{localStorage.setItem('be-theme',t)}catch(e){}document.cookie='be-theme='+t+'; Max-Age=31536000; Path=/; SameSite=Lax'})();";
