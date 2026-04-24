import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// HIW v8 reduced-motion contract:
//
//   - CSS transitions on .hiw__diagJudgeBody, .hiw__diagVaultBucket,
//     .hiw__diagVaultRefundCue, .hiw__diagSoulboundCue etc. are dropped
//     under prefers-reduced-motion: reduce.
//   - Final state still lands: opacity values resolve instantly to the
//     same result a non-reduced-motion user sees after the transition
//     ends.
//
// This spec emulates reduced-motion at the browser level and verifies
// the final-frame values match their normal counterparts.

async function opacityOf(
  page: import('@playwright/test').Page,
  selector: string,
): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return NaN;
    return parseFloat(getComputedStyle(el).opacity);
  }, selector);
}

test.describe('HIW · reduced-motion seed-state parity', () => {
  test.use({ reducedMotion: 'reduce' });

  test.beforeEach(async ({ page }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'done',
    );
    await page.waitForSelector('#hiw');
    await page.locator('#hiw').scrollIntoViewIfNeeded();
  });

  test('judge opacity still flips on dispute outcomes (instant, not transitioned)', async ({
    page,
  }) => {
    // Pick the inner body, not the outer <g> (GSAP opacity=0 at rest).
    const getJudgeBodyOpacity = async () =>
      page.evaluate(() => {
        const body = document.querySelector(
          'section#hiw [data-hiw-role="judge"] > g',
        ) as HTMLElement | null;
        if (!body) return NaN;
        return parseFloat(getComputedStyle(body).opacity);
      });

    await page.locator('[data-hiw-outcome-chip="disputeBuyer"]').click();
    // No transition → next tick should already show the final value
    await expect.poll(() => getJudgeBodyOpacity()).toBeCloseTo(1, 1);
  });

  test('seller-win buckets land on full opacity instantly on disputeSeller', async ({
    page,
  }) => {
    await page.locator('[data-hiw-outcome-chip="disputeSeller"]').click();
    await expect
      .poll(() => opacityOf(page, '[data-hiw="vault-bucket-seller"]'))
      .toBeCloseTo(1, 1);
    await expect
      .poll(() => opacityOf(page, '[data-hiw="vault-bucket-middleman"]'))
      .toBeCloseTo(1, 1);
    await expect
      .poll(() => opacityOf(page, '[data-hiw="vault-bucket-platform"]'))
      .toBeCloseTo(1, 1);
  });

  test('refund cue lands on full opacity instantly on refund', async ({
    page,
  }) => {
    await page.locator('[data-hiw-outcome-chip="refund"]').click();
    await expect
      .poll(() => opacityOf(page, '[data-hiw="vault-refund-cue"]'))
      .toBeCloseTo(1, 1);
  });

  test('withdraw-cue text reveals on every Safeguards outcome', async ({
    page,
  }) => {
    for (const id of [
      'refund',
      'disputeBuyer',
      'disputeSeller',
      'timeout',
    ] as const) {
      await page.locator(`[data-hiw-outcome-chip="${id}"]`).click();
      await expect
        .poll(() => opacityOf(page, '[data-hiw="vault-withdraw-cue"]'))
        .toBeCloseTo(1, 1);
      await page.locator(`[data-hiw-outcome-chip="${id}"]`).click();
    }
  });
});
