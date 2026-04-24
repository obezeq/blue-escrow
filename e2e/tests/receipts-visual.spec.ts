import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// Receipts visual parity across 5 breakpoints x 2 themes (10 snapshots)
// + a reduced-motion smoke. Focus is the soulbound card "híbrido sofisticado"
// light-mode polish — the dark-base + glassy overlay + brand-tinted shadow
// stack must read as deliberate (not accidentally dark) on light backgrounds.
//
// useCardTilt already short-circuits on prefers-reduced-motion, so forcing
// reduce keeps the cards in their initial transform = 0 state for stable
// screenshots. The card reveal stagger also collapses to clearProps.
// primeThemeAndSkipPreloader is shared with hero-visual + howitworks-visual.

const VIEWPORTS = [
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '390x844', width: 390, height: 844 },
] as const;

const THEMES = ['dark', 'light'] as const;

test.describe('Receipts visual parity (soulbound híbrido)', () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`${viewport.label} ${theme}`, async ({ page }) => {
        await primeThemeAndSkipPreloader(page, theme);
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: 'reduce',
        });
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto('/');

        await page.waitForSelector('#receipts h2', { state: 'visible' });
        await page.evaluate(() => document.fonts.ready);

        const receipts = page.locator('#receipts');
        await receipts.scrollIntoViewIfNeeded();

        await page.waitForTimeout(1500);

        await expect(receipts).toHaveScreenshot(
          `receipts-${viewport.label}-${theme}.png`,
          {
            animations: 'disabled',
            // Permissive — the soul card glassy overlay + radial gradients
            // produce 1-2% sub-pixel variance between runs even with
            // reduced-motion. Tighten after we have CI baselines.
            maxDiffPixelRatio: 0.02,
            threshold: 0.1,
            timeout: 20_000,
          },
        );
      });
    }
  }

  test('reduced-motion — Receipts still renders', async ({ page }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.emulateMedia({
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.waitForSelector('#receipts h2', { state: 'visible' });
    await page.evaluate(() => document.fonts.ready);

    const receipts = page.locator('#receipts');
    await receipts.scrollIntoViewIfNeeded();
    await expect(receipts).toBeVisible();
    const box = await receipts.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });
});
