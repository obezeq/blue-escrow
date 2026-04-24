import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// HIW v8 Safeguards outcome contract:
//   1. The happy path renders section[data-hiw-outcome="happy"] and every
//      [data-hiw-outcome-chip] has aria-selected="false".
//   2. Clicking a chip:
//        - flips that chip's aria-selected to "true" and all others to "false"
//        - writes data-hiw-outcome="<id>" on section#hiw
//        - unhides the matching [data-hiw-outcome-panel] and keeps others hidden
//        - updates the [data-hiw-outcome-announcer] text
//   3. Re-clicking the active chip returns the section to happy-path state.
//
// Runs at 1440×900 so the desktop stage is guaranteed (min-width 900 +
// min-height 700 per #96 header-clearance rules).

test.describe('HIW · Safeguards outcome switching', () => {
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

  test('default state marks happy-path on section + all chips aria-selected=false', async ({
    page,
  }) => {
    const section = page.locator('section#hiw');
    await expect(section).toHaveAttribute('data-hiw-outcome', 'happy');

    for (const id of [
      'refund',
      'disputeBuyer',
      'disputeSeller',
      'timeout',
    ] as const) {
      const chip = section.locator(`[data-hiw-outcome-chip="${id}"]`);
      await expect(chip).toHaveAttribute('aria-selected', 'false');
    }
  });

  test.describe('outcome cycling', () => {
    for (const id of [
      'refund',
      'disputeBuyer',
      'disputeSeller',
      'timeout',
    ] as const) {
      test(`selecting "${id}" flips attributes + reveals matching panel`, async ({
        page,
      }) => {
        const section = page.locator('section#hiw');
        const chip = section.locator(`[data-hiw-outcome-chip="${id}"]`);
        await chip.click();

        await expect(chip).toHaveAttribute('aria-selected', 'true');
        await expect(section).toHaveAttribute('data-hiw-outcome', id);

        const panel = section.locator(`[data-hiw-outcome-panel="${id}"]`);
        await expect(panel).toBeVisible();

        // Every other panel stays hidden.
        for (const otherId of [
          'refund',
          'disputeBuyer',
          'disputeSeller',
          'timeout',
        ].filter((x) => x !== id)) {
          const otherPanel = section.locator(
            `[data-hiw-outcome-panel="${otherId}"]`,
          );
          await expect(otherPanel).toBeHidden();
        }
      });
    }
  });

  test('re-clicking the active chip returns to happy path', async ({ page }) => {
    const section = page.locator('section#hiw');
    const chip = section.locator('[data-hiw-outcome-chip="disputeSeller"]');

    await chip.click();
    await expect(section).toHaveAttribute('data-hiw-outcome', 'disputeSeller');

    await chip.click();
    await expect(section).toHaveAttribute('data-hiw-outcome', 'happy');
    await expect(chip).toHaveAttribute('aria-selected', 'false');
  });

  test('announcer live region updates per outcome', async ({ page }) => {
    const section = page.locator('section#hiw');
    const live = section.locator('[data-hiw-outcome-announcer]');

    await expect(live).toHaveAttribute('aria-live', 'polite');
    await expect(live).toContainText(/happy path active/i);

    await section.locator('[data-hiw-outcome-chip="refund"]').click();
    await expect(live).toContainText(/Refund outcome selected/i);

    await section.locator('[data-hiw-outcome-chip="disputeSeller"]').click();
    await expect(live).toContainText(/Dispute/i);
    await expect(live).toContainText(/Fees apply/i);
  });
});
