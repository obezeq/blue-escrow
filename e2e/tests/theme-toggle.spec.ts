import { expect, test } from '@playwright/test';
import {
  PRELOADER_SESSION_KEY,
  THEME_STORAGE_KEY,
  primeThemeAndSkipPreloader,
} from './_utils/prime-theme';

// Theme toggle contract:
//   1. Clicking the <button role="switch"> flips `html[data-theme]` from
//      'dark' to 'light' (the React ThemeProvider writes localStorage, the
//      dataset, AND the `be-theme` cookie inside `runThemeTransition`).
//   2. localStorage[THEME_STORAGE_KEY] reflects the new value synchronously.
//   3. After reload, the server reads the `be-theme` cookie and ships
//      `<html data-theme="light">` in the INITIAL HTML response — proven
//      by parsing `page.content()` before client script runs.
//   4. Zero hydration warnings in the console across the entire flow.

const HYDRATION_PATTERN =
  /hydrat|text content does not match|prop.*did not match/i;

test.describe('Theme toggle persistence', () => {
  test('clicking the switch flips html[data-theme], persists across reload, no hydration warnings', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await primeThemeAndSkipPreloader(page, 'dark');
    await page.goto('/');

    // Server MUST ship the cookie-aligned theme in the very first HTML byte.
    // Check `page.content()` BEFORE hydration finishes — proves SSR wrote
    // `data-theme="dark"` directly (not a client-side rewrite).
    const initialHtml = await page.content();
    expect(initialHtml).toMatch(/<html[^>]*data-theme="dark"/);

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

    // State + storage + cookie should all reflect the light theme after toggle.
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
    await expect
      .poll(async () => {
        const cookies = await page.context().cookies();
        return cookies.find((c) => c.name === 'be-theme')?.value ?? null;
      })
      .toBe('light');

    // Keep the preloader-skip flag through the reload so the assertion
    // doesn't race against the 4s hero hold.
    await page.addInitScript((sessionKey) => {
      try {
        sessionStorage.setItem(sessionKey, '1');
      } catch {
        /* noop */
      }
    }, PRELOADER_SESSION_KEY);

    await page.reload();

    // Second-load SSR must now ship `data-theme="light"` directly in the
    // initial HTML — the core contract of cookie-driven SSR theming.
    const reloadedHtml = await page.content();
    expect(reloadedHtml).toMatch(/<html[^>]*data-theme="light"/);

    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'done',
    );

    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.dataset.theme),
      )
      .toBe('light');

    // No console errors / warnings / page errors that match hydration.
    const hydrationNoise = [
      ...consoleErrors,
      ...pageErrors,
    ].filter((m) => HYDRATION_PATTERN.test(m));
    expect(hydrationNoise).toEqual([]);
  });
});
