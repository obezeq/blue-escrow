import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// FAQ interaction contract: clicking a question button must:
//   1. Flip the button's aria-expanded from 'false' to 'true'.
//   2. Flip the matching panel's aria-hidden from 'true' to 'false'.
//   3. Re-hide the panel and reset aria-expanded when the same button is
//      clicked again (single-open accordion semantics in Faq.tsx).
//
// We prime dark theme to match the baseline visual state; the aria behavior
// is theme-agnostic, so one pass is enough — light theme is covered
// implicitly by the shared unit-level a11y suite.

test.describe('FAQ accordion interaction', () => {
  test('clicking a question toggles aria-expanded + aria-hidden on the panel', async ({
    page,
  }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.goto('/');

    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'done',
    );
    await page.waitForSelector('#faq');

    const faqSection = page.locator('#faq');
    await faqSection.scrollIntoViewIfNeeded();

    const firstButton = faqSection.locator('button[aria-expanded]').first();
    await expect(firstButton).toBeVisible();
    await expect(firstButton).toHaveAttribute('aria-expanded', 'false');

    const panelId = await firstButton.getAttribute('aria-controls');
    expect(panelId).not.toBeNull();
    const panel = page.locator(`#${panelId}`);
    await expect(panel).toHaveAttribute('aria-hidden', 'true');

    await firstButton.click();
    await expect(firstButton).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toHaveAttribute('aria-hidden', 'false');

    // Click again to verify the close path resets both attributes.
    await firstButton.click();
    await expect(firstButton).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toHaveAttribute('aria-hidden', 'true');
  });
});
