import { expect, test } from '@playwright/test';
import { PRELOADER_SESSION_KEY } from './_utils/prime-theme';

// First-visit contract (no cookie, OS prefers light):
//   1. First request: server has no `be-theme` cookie, SSR ships the
//      DEFAULT_THEME (`data-theme="dark"`). This is the ONE acceptable edge
//      where server and resolved client theme can differ.
//   2. Pre-hydration script (theme-bootstrap.ts) sees no cookie, falls back
//      to `prefers-color-scheme: light`, rewrites `dataset.theme="light"`,
//      and persists both cookie and localStorage for future requests.
//   3. ThemeProvider's reconcile effect syncs React state to match the DOM
//      (one-shot, ref-guarded) so ThemeToggle's aria-checked is correct.
//   4. Reload: server now reads the cookie the script wrote and SSR ships
//      `<html data-theme="light">` directly — mismatch-free return visit.

test.describe('Theme first-visit flow (no cookie, OS light)', () => {
  test('script writes cookie, and subsequent reload SSRs the correct theme', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    // Emulate OS color scheme so the `prefers-color-scheme: light` fallback
    // triggers during the first paint script.
    await page.emulateMedia({ colorScheme: 'light' });

    // Skip the preloader hold so the test isn't dominated by the 4s delay.
    await page.addInitScript((sessionKey) => {
      try {
        sessionStorage.setItem(sessionKey, '1');
      } catch {
        /* noop */
      }
    }, PRELOADER_SESSION_KEY);

    await page.goto('/');

    // First request: cookie is absent → server ships DEFAULT_THEME='dark'
    // in the HTML. Pre-hydration script then rewrites to 'light' before
    // paint. We can only inspect the DOM after the script has run, which
    // is what happens in this assertion.
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.dataset.theme),
      )
      .toBe('light');

    // Script must have persisted the cookie so the next SSR gets it right.
    await expect
      .poll(async () => {
        const cookies = await context.cookies();
        return cookies.find((c) => c.name === 'be-theme')?.value ?? null;
      })
      .toBe('light');

    // aria-checked on the toggle must reconcile to true after the effect.
    const toggle = page.getByRole('switch');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Reload: server now sees the cookie the script wrote. The INITIAL HTML
    // response must already carry `data-theme="light"` — the whole point of
    // cookie-driven SSR theming.
    await page.reload();
    const reloadedHtml = await page.content();
    expect(reloadedHtml).toMatch(/<html[^>]*data-theme="light"/);
  });
});
