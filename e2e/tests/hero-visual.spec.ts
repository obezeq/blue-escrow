import { expect, test } from '@playwright/test';

// Hero visual parity with Blue Escrow v6.html: skip the preloader via the
// `preloader:done` sessionStorage flag so the hero renders on first paint,
// pin the theme (colorScheme + localStorage be-theme), then assert the
// #hero top edge is ~0 (catches the main paddingTop regression) before
// snapshotting. Reduced-motion case skips the screenshot since clearProps
// leaves no animated state to lock in.

const THEME_STORAGE_KEY = 'be-theme';
const PRELOADER_SESSION_KEY = 'preloader:done';

const VIEWPORTS = [
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '390x844', width: 390, height: 844 },
] as const;

const THEMES = ['dark', 'light'] as const;

async function primeThemeAndSkipPreloader(
  page: import('@playwright/test').Page,
  theme: 'dark' | 'light',
) {
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

test.describe('Hero visual parity (v6)', () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`${viewport.label} ${theme}`, async ({ page }) => {
        await primeThemeAndSkipPreloader(page, theme);
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto('/');

        await page.waitForSelector('#hero h1', { state: 'visible' });
        await page.evaluate(() => document.fonts.ready);
        // Let GSAP finish: HeroAnimations handoff runs immediately because
        // the preloader-done flag is already set, so the timeline settles
        // in well under 1s.
        await page.waitForTimeout(1200);
        await page.evaluate(() => window.scrollTo(0, 0));

        const box = await page.locator('#hero').boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y).toBeLessThan(8);

        await expect(page.locator('#hero')).toHaveScreenshot(
          `hero-${viewport.label}-${theme}.png`,
          {
            animations: 'disabled',
            maxDiffPixelRatio: 0.002,
            threshold: 0.1,
            timeout: 15_000,
          },
        );
      });
    }
  }

  test('reduced-motion — hero still renders', async ({ page }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.emulateMedia({
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.waitForSelector('#hero h1', { state: 'visible' });
    await page.evaluate(() => document.fonts.ready);

    const hero = page.locator('#hero');
    await expect(hero).toBeVisible();
    const box = await hero.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });
});
