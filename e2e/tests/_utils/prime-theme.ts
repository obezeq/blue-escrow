import type { Page } from '@playwright/test';

// Shared helper — applied BEFORE the first navigation so the server reads
// the `be-theme` cookie for cookie-driven SSR theming, `theme-bootstrap`
// finds the primed localStorage value on the very first paint (no FOUC),
// and the Preloader `sessionStorage` flag short-circuits the 4s hold.
// Matches the playbook used by `hero-visual.spec.ts` verbatim; extracted
// so every interaction spec boots the homepage in the same deterministic
// state with zero hydration warnings.

export const THEME_COOKIE_NAME = 'be-theme';
export const THEME_STORAGE_KEY = 'be-theme';
export const PRELOADER_SESSION_KEY = 'preloader:done';

// Must stay in sync with playwright.config.ts `use.baseURL`. Declared here
// rather than imported so the helper has no dependency on config wiring
// (config is typed defineConfig — not trivially re-exportable as a value).
const DEFAULT_BASE_URL = 'http://localhost:3000';

export type PrimeTheme = 'dark' | 'light';

export async function primeThemeAndSkipPreloader(
  page: Page,
  theme: PrimeTheme,
): Promise<void> {
  // Cookie first — server reads it during SSR so the initial HTML already
  // carries the correct `data-theme` attribute. Runs before navigation via
  // `context.addCookies`, which needs an explicit url to resolve the domain
  // + scheme for the cookie jar.
  await page.context().addCookies([
    {
      name: THEME_COOKIE_NAME,
      value: theme,
      url: DEFAULT_BASE_URL,
      sameSite: 'Lax',
    },
  ]);

  await page.addInitScript(
    ({ themeKey, themeValue, sessionKey }) => {
      try {
        sessionStorage.setItem(sessionKey, '1');
      } catch {
        /* noop */
      }
      try {
        localStorage.setItem(themeKey, themeValue);
      } catch {
        /* noop */
      }
    },
    {
      themeKey: THEME_STORAGE_KEY,
      themeValue: theme,
      sessionKey: PRELOADER_SESSION_KEY,
    },
  );
  await page.emulateMedia({ colorScheme: theme });
}
