import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// HIW v8 JudgePodium opacity contract (CSS custom property
// --hiw-judge-opacity written by useOutcomeBranch):
//
//   happy       · 0.3 (standby — referee never touches happy path)
//   refund      · 0.3 (seller accepts; middleman idle)
//   disputeBuyer · 1.0 (middleman rules)
//   disputeSeller · 1.0 (middleman rules)
//   timeout     · 0.3 (permissionless rescue; middleman idle)
//
// This spec reads the computed --hiw-judge-opacity on the section root
// after each click so the full chain (context → hook → style prop)
// stays locked end-to-end in a real browser.

async function readJudgeOpacity(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const section = document.querySelector('section#hiw') as HTMLElement | null;
    if (!section) return null;
    return section.style.getPropertyValue('--hiw-judge-opacity').trim();
  });
}

test.describe('HIW · JudgePodium opacity contract', () => {
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

  test('happy path keeps the judge dimmed at 0.3', async ({ page }) => {
    expect(await readJudgeOpacity(page)).toBe('0.3');
  });

  test('disputeBuyer lifts the judge to full opacity', async ({ page }) => {
    await page.locator('[data-hiw-outcome-chip="disputeBuyer"]').click();
    await expect
      .poll(() => readJudgeOpacity(page))
      .toBe('1');
  });

  test('disputeSeller also lifts the judge to full opacity', async ({ page }) => {
    await page.locator('[data-hiw-outcome-chip="disputeSeller"]').click();
    await expect
      .poll(() => readJudgeOpacity(page))
      .toBe('1');
  });

  for (const id of ['refund', 'timeout'] as const) {
    test(`${id} keeps the judge dimmed (middleman idle)`, async ({ page }) => {
      await page.locator(`[data-hiw-outcome-chip="${id}"]`).click();
      await expect
        .poll(() => readJudgeOpacity(page))
        .toBe('0.3');
    });
  }

  test('the sticky chip always reads "Can vote · Cannot withdraw"', async ({
    page,
  }) => {
    const chipLabel = page
      .locator('section#hiw')
      .getByText(/Can vote.*Cannot withdraw/i)
      .first();
    await expect(chipLabel).toBeVisible();
  });
});
