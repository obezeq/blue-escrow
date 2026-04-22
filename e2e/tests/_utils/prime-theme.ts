import type { Page } from '@playwright/test';

// Shared helper — applied via `page.addInitScript` BEFORE the first
// navigation so `theme-bootstrap` reads the primed localStorage value
// on the very first paint (no FOUC) and the Preloader `sessionStorage`
// flag short-circuits the 4s hold. Matches the playbook used by
// `hero-visual.spec.ts` verbatim; extracted so every interaction spec
// boots the homepage in the same deterministic state.

export const THEME_STORAGE_KEY = 'be-theme';
export const PRELOADER_SESSION_KEY = 'preloader:done';

export type PrimeTheme = 'dark' | 'light';

export async function primeThemeAndSkipPreloader(
  page: Page,
  theme: PrimeTheme,
): Promise<void> {
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
