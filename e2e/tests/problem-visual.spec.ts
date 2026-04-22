import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// TheProblem ("The Fall + velocity") visual parity across 5 breakpoints x 2
// themes (10 snapshots). Shares primeThemeAndSkipPreloader with the other
// homepage visual specs so every section boots in the same deterministic
// theme + preloader-skipped state.
//
// The Fall choreography is ~1.2s and includes a scroll-scrubbed strikethrough
// (`--strike-scale`) plus a velocity-driven `--drift-y` drift on the
// "a stranger too" element. Both are non-deterministic under scrub, so we:
//   1) wait ~1.4s for the intro tweens to settle,
//   2) force the final paint state by pinning both custom properties inline
//      on `[data-animate="stranger"]`,
//   3) emulate `prefers-reduced-motion: reduce` to silence any remaining
//      tween ticks and prevent Observer-driven drift while Playwright is
//      taking the shot.

const VIEWPORTS = [
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '390x844', width: 390, height: 844 },
] as const;

const THEMES = ['dark', 'light'] as const;

test.describe('TheProblem visual parity (The Fall + velocity)', () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`problem — ${viewport.label} ${theme}`, async ({ page }) => {
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

        // Belt-and-suspenders: helper skips the preloader, but guard against
        // structural drift (TheProblem render being removed from page.tsx).
        await page.waitForSelector('#problem', { state: 'attached' });
        await page.evaluate(() => document.fonts.ready);

        const problem = page.locator('#problem');
        await problem.scrollIntoViewIfNeeded();

        // The Fall choreography is ~1.2s; 1400ms gives ScrollTrigger a
        // moment to refresh after the scroll, plus headroom for the
        // clip-path wipe delays (idx * 0.12 chain).
        await page.waitForTimeout(1400);

        // Lock the stranger line's CSS custom properties to their final
        // painted state regardless of scrub position. `--strike-scale: 1`
        // paints the strikethrough pseudo full-width; `--drift-y: 0px`
        // parks the Observer-driven drift at rest. Also clears any
        // inline transforms/opacity left by incomplete tweens so reduced
        // motion + the snapshot see the settled layout.
        await page.evaluate(() => {
          const stranger = document.querySelector<HTMLElement>(
            '#problem [data-animate="stranger"]',
          );
          if (stranger) {
            stranger.style.setProperty('--strike-scale', '1');
            stranger.style.setProperty('--drift-y', '0px');
          }
        });

        // Double-RAF: let paint commit the forced state before shooting.
        await page.evaluate(
          () =>
            new Promise<void>((r) =>
              requestAnimationFrame(() => requestAnimationFrame(() => r())),
            ),
        );

        await expect(problem).toHaveScreenshot(
          `problem-${viewport.label}-${theme}.png`,
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

  test('reduced-motion — TheProblem still renders', async ({ page }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.emulateMedia({
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.waitForSelector('#problem', { state: 'attached' });
    await page.evaluate(() => document.fonts.ready);

    const problem = page.locator('#problem');
    await problem.scrollIntoViewIfNeeded();
    await expect(problem).toBeVisible();
    const box = await problem.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });
});
