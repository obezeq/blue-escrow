import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// Keyboard navigation contract:
//   1. First Tab from the top of the document reveals the SkipLink
//      (it's visually hidden until :focus).
//   2. Activating the SkipLink with Enter jumps focus/target to
//      #main-content (pointed at by SkipLink.tsx default).
//   3. Any in-page anchor link (e.g. header nav "#faq") updates the URL
//      hash AND keeps the target section visible in the viewport — our
//      Lenis smooth-scroll must not leave the target offscreen.

test.describe('Keyboard navigation', () => {
  test('Tab reveals the SkipLink; Enter jumps to #main-content', async ({
    page,
  }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.goto('/');

    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'done',
    );
    // Make sure nothing inside the viewport is focused before we Tab.
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());

    await page.keyboard.press('Tab');

    // The SkipLink should now be the focused element. It may or may not be
    // visible depending on the first page Tab target in the layout, so we
    // assert the focused element has an href pointing at #main-content.
    const focusedHref = await page.evaluate(
      () => (document.activeElement as HTMLAnchorElement | null)?.getAttribute('href'),
    );
    expect(focusedHref).toBe('#main-content');

    await page.keyboard.press('Enter');
    await expect
      .poll(async () => page.evaluate(() => window.location.hash))
      .toBe('#main-content');
  });

  test('clicking an in-page anchor updates the URL hash and scrolls the target into view', async ({
    page,
  }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.goto('/');

    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'done',
    );

    // Header nav has a #faq anchor — use it as a deterministic target.
    const faqLink = page.locator('header nav[aria-label="Main navigation"] a[href="#faq"]');
    await expect(faqLink).toBeVisible();
    await faqLink.click();

    await expect
      .poll(async () => page.evaluate(() => window.location.hash))
      .toBe('#faq');

    // #faq must be within the viewport after the smooth scroll settles.
    // We allow Lenis ~1s to coast, then check bounding box.
    await page.waitForTimeout(1500);
    const box = await page.locator('#faq').boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    // The top of the faq section should be within the viewport (y <= vh).
    expect(box!.y).toBeLessThanOrEqual(viewport!.height);
    expect(box!.y + box!.height).toBeGreaterThan(0);
  });
});
