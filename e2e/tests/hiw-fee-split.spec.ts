import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// HIW v8 fee-split reveal contract:
//
// The pending-balance buckets (seller / middleman / platform) are
// visible ONLY when the active outcome applies fees — i.e.
// happy-path scroll end AND disputeSeller. On refund, disputeBuyer,
// and timeout the single CLIENT REFUND pill replaces them.
//
// Visibility is driven by CSS:
//   .hiw__diagVaultBucket      opacity = outcome-active * fee-applies
//   .hiw__diagVaultRefundCue   opacity = outcome-active * (1 - fee-applies)
//
// This spec exercises each outcome and asserts the right cue is the
// visible one (opacity ≈ 1) and the other is off (opacity ≈ 0).

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

async function expectOpacity(
  page: import('@playwright/test').Page,
  selector: string,
  expected: number,
) {
  await expect
    .poll(() => opacityOf(page, selector))
    .toBeCloseTo(expected, 1);
}

test.describe('HIW · fee-split bucket vs refund cue reveal', () => {
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

  test('happy path hides both cues (the scroll timeline will reveal later)', async ({
    page,
  }) => {
    await expectOpacity(page, '[data-hiw="vault-bucket-seller"]', 0);
    await expectOpacity(page, '[data-hiw="vault-refund-cue"]', 0);
  });

  test('disputeSeller reveals the three seller-win buckets, hides the refund cue', async ({
    page,
  }) => {
    await page.locator('[data-hiw-outcome-chip="disputeSeller"]').click();

    await expectOpacity(page, '[data-hiw="vault-bucket-seller"]', 1);
    await expectOpacity(page, '[data-hiw="vault-bucket-middleman"]', 1);
    await expectOpacity(page, '[data-hiw="vault-bucket-platform"]', 1);
    await expectOpacity(page, '[data-hiw="vault-refund-cue"]', 0);
  });

  for (const id of ['refund', 'disputeBuyer', 'timeout'] as const) {
    test(`${id} reveals the CLIENT REFUND cue, hides the seller-win buckets`, async ({
      page,
    }) => {
      await page.locator(`[data-hiw-outcome-chip="${id}"]`).click();

      await expectOpacity(page, '[data-hiw="vault-refund-cue"]', 1);
      await expectOpacity(page, '[data-hiw="vault-bucket-seller"]', 0);
      await expectOpacity(page, '[data-hiw="vault-bucket-middleman"]', 0);
      await expectOpacity(page, '[data-hiw="vault-bucket-platform"]', 0);
    });
  }

  // SOULBOUND NFT cue was removed as visual noise. Mint attribution
  // is implicit via the ledger event log ("Released · 3 receipts
  // minted") — no dedicated SVG element left to assert.
});
