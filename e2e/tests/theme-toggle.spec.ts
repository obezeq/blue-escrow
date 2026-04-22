import { expect, test } from '@playwright/test';
import {
  PRELOADER_SESSION_KEY,
  THEME_STORAGE_KEY,
  primeThemeAndSkipPreloader,
} from './_utils/prime-theme';

// Theme toggle contract:
//   1. Clicking the <button role="switch"> flips `html[data-theme]` from
//      'dark' to 'light' (the React ThemeProvider writes both localStorage
//      and the dataset inside `runThemeTransition`).
//   2. localStorage[THEME_STORAGE_KEY] reflects the new value synchronously.
//   3. After reload, the pre-hydration theme-bootstrap script reads the
//      persisted value and paints 'light' before React hydrates — no FOUC.

test.describe('Theme toggle persistence', () => {
  test('clicking the switch flips html[data-theme] and persists across reload', async ({
    page,
  }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.goto('/');

    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'done',
    );

    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.dataset.theme),
      )
      .toBe('dark');

    const toggle = page.getByRole('switch');
    await expect(toggle).toBeVisible();
    await toggle.click();

    // State + storage should both reflect the light theme after toggle.
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.dataset.theme),
      )
      .toBe('light');
    await expect
      .poll(async () =>
        page.evaluate((key) => window.localStorage.getItem(key), THEME_STORAGE_KEY),
      )
      .toBe('light');

    // Keep the preloader-skip flag through the reload so the assertion
    // doesn't race against the 4s hero hold (we keep dispatching the
    // primer on every navigation via addInitScript within primeTheme…).
    await page.addInitScript((sessionKey) => {
      try {
        sessionStorage.setItem(sessionKey, '1');
      } catch {
        /* noop */
      }
    }, PRELOADER_SESSION_KEY);

    await page.reload();
    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'done',
    );

    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.dataset.theme),
      )
      .toBe('light');
  });
});
