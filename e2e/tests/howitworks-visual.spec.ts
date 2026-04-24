import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// HowItWorks visual parity across 5 breakpoints x 2 themes (10 snapshots)
// + a reduced-motion smoke. Shares primeThemeAndSkipPreloader with
// hero-visual and receipts-visual so every homepage spec boots in the
// same deterministic theme + preloader-skipped state.
//
// HIW has a pinned scrub timeline that mutates the DOM continuously while
// the section is in view, which makes pixel-diffs flaky. We force
// `prefers-reduced-motion: reduce` so HowItWorksAnimations falls into its
// gsap.matchMedia reduce branch (clearProps: 'all') and the section parks
// in a deterministic phase-0 state.

const VIEWPORTS = [
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '390x844', width: 390, height: 844 },
] as const;

const THEMES = ['dark', 'light'] as const;

test.describe('HowItWorks visual parity (v6 light/dark polish)', () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`${viewport.label} ${theme}`, async ({ page }) => {
        await primeThemeAndSkipPreloader(page, theme);
        // reducedMotion is the *key* lever for snapshot stability — without
        // it the scrub timeline ticks while the screenshot is being taken.
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: 'reduce',
        });
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto('/');

        await page.waitForSelector('#hiw h2', { state: 'visible' });
        await page.evaluate(() => document.fonts.ready);

        const hiw = page.locator('#hiw');
        await hiw.scrollIntoViewIfNeeded();

        // Slightly more generous than hero (1200ms) — HIW has more surface
        // (ledger card, scene card, SVG diagram, rail) and ScrollTrigger
        // refresh after scrollIntoView needs to settle.
        await page.waitForTimeout(1500);

        await expect(hiw).toHaveScreenshot(
          `hiw-${viewport.label}-${theme}.png`,
          {
            animations: 'disabled',
            // Permissive — HIW has more SVG surface (diagram + filter defs +
            // multiple gradients) producing 1-2% sub-pixel variance even with
            // reduced-motion. Tighten after CI baselines settle.
            maxDiffPixelRatio: 0.02,
            threshold: 0.1,
            timeout: 20_000,
          },
        );
      });
    }
  }

  test('reduced-motion — HowItWorks still renders', async ({ page }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.emulateMedia({
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.waitForSelector('#hiw h2', { state: 'visible' });
    await page.evaluate(() => document.fonts.ready);

    const hiw = page.locator('#hiw');
    await hiw.scrollIntoViewIfNeeded();
    await expect(hiw).toBeVisible();
    const box = await hiw.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });
});
