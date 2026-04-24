import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// HowItWorks rail interaction contract:
//   1. Each rail button carries aria-pressed reflecting the active step.
//   2. Clicking a non-active rail button flips its aria-pressed to 'true'
//      AND flips the previously-active button to 'false' (single-select).
//   3. The ledger state chip (aria-live=polite inside the aside landmark)
//      updates its text when the active step changes — the assistive-tech
//      signal that the "state" moved forward.

test.describe('HowItWorks rail interaction', () => {
  test('clicking a rail button flips aria-pressed and updates the live state chip', async ({
    page,
  }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    // The desktop stage (which hosts the rail) requires min-width:900 and
    // min-height:700 after the #96 header-clearance change (which bumps the
    // short-viewport fallback to max-height:771). Playwright's default 1280×720
    // otherwise falls into the mobile deck branch where there's no rail.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'done',
    );
    await page.waitForSelector('#hiw');

    const hiw = page.locator('#hiw');
    await hiw.scrollIntoViewIfNeeded();

    const rail = hiw.locator('nav[aria-label="How it works step rail"]');
    await expect(rail).toBeVisible();

    const step0 = rail.locator('[data-hiw-rail="0"]');
    const step4 = rail.locator('[data-hiw-rail="4"]');

    // Initial state: step 0 is active.
    await expect(step0).toHaveAttribute('aria-pressed', 'true');
    await expect(step4).toHaveAttribute('aria-pressed', 'false');

    // Live region chip sits inside the ledger aside; capture the baseline
    // text so we can assert it changed after the rail click.
    const stateChip = hiw.locator(
      'aside[aria-label^="Escrow"] [aria-live="polite"]',
    );
    await expect(stateChip).toBeVisible();
    const baseLabel = (await stateChip.textContent())?.trim() ?? '';

    // Click "Release" (step 4). `force: true` bypasses Lenis/smooth-scroll
    // interception on viewport edges where the rail may be partly offscreen.
    await step4.click({ force: true });

    await expect(step4).toHaveAttribute('aria-pressed', 'true');
    await expect(step0).toHaveAttribute('aria-pressed', 'false');

    // Label must change — exact copy comes from steps.ts ("Released").
    await expect(stateChip).not.toHaveText(baseLabel);
    await expect(stateChip).toHaveText(/released/i);
  });
});
