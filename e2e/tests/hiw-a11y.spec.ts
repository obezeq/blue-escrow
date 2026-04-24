import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// Refs #99. After the SVG diagram lost aria-hidden and gained a proper
// <title>/<desc> pair the contract is:
//   1. <svg role="img" aria-labelledby="hiw-diag-title hiw-diag-desc"> so
//      screen readers announce the three-party escrow summary.
//   2. The three role labels resolve to a non-black fill in dark mode
//      (previously the orphan `.hiw__diagActor*` classes let them collapse
//      to `fill: black` on dark navy — invisible).
//   3. Rail phase buttons are keyboard-focusable in source order.
//   4. `prefers-contrast: more` and `forced-colors: active` each fire a
//      documented token override so the diagram survives user preferences.
//
// The tests are deliberately DOM-level (computed style + attribute checks)
// rather than visual/animation-level so they don't regress on GSAP timeline
// changes or prefers-reduced-motion branches.

test.describe('HowItWorks SVG diagram a11y — refs #99', () => {
  test.beforeEach(async ({ page }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForSelector('#hiw');
  });

  test('SVG exposes role=img + labelledby and the referenced <title>/<desc> both exist', async ({
    page,
  }) => {
    const svg = page.locator('#hiw svg[aria-labelledby]').first();
    await expect(svg).toHaveAttribute('role', 'img');
    const ariaLabelledBy = await svg.getAttribute('aria-labelledby');
    expect(ariaLabelledBy).not.toBeNull();
    const ids = (ariaLabelledBy ?? '').split(/\s+/).filter(Boolean);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    for (const id of ids) {
      await expect(svg.locator(`#${id}`)).toHaveCount(1);
    }
    await expect(svg.locator('title').first()).toContainText(/escrow/i);
    await expect(svg.locator('desc').first()).toContainText(
      /client|middleman|seller/i,
    );
  });

  test('rail phase buttons receive focus in source order', async ({ page }) => {
    // Desktop rail lives inside `.hiw__stage`, which is hidden under the
    // max-height: 771px guard (mobile step-deck takes over). Force a
    // 1440x900 viewport so the rail is rendered and focusable.
    await page.setViewportSize({ width: 1440, height: 900 });
    const firstRail = page.locator('[data-hiw-rail="0"]');
    await firstRail.scrollIntoViewIfNeeded();
    await firstRail.focus();
    await expect(firstRail).toBeFocused();

    // Second rail sits next in the tab order even though intermediate
    // elements (the scene SVG) are not tabbable. Tabbing moves forward.
    await page.keyboard.press('Tab');
    const nextFocus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el?.getAttribute('data-hiw-rail') ?? null;
    });
    expect(nextFocus).toBe('1');
  });

  test('CLIENT / MIDDLEMAN / SELLER labels resolve to a non-black fill in dark mode', async ({
    page,
  }) => {
    for (const role of ['CLIENT', 'MIDDLEMAN', 'SELLER']) {
      const label = page.locator('#hiw svg text', { hasText: role }).first();
      await expect(label).toHaveCount(1);
      const fill = await label.evaluate((el) =>
        getComputedStyle(el as SVGGraphicsElement).fill,
      );
      // Orphan-class regression would produce rgb(0,0,0). We accept any
      // non-black color — the unit APCA + WCAG tests cover the exact values.
      expect(fill).not.toBe('rgb(0, 0, 0)');
      expect(fill.replace(/\s+/g, '')).not.toBe('rgba(0,0,0,0)');
    }
  });
});

test.describe('HowItWorks SVG — forced-colors + prefers-contrast (refs #99)', () => {
  test('forced-colors: active — the three role labels still resolve to a system-color fill', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      colorScheme: 'dark',
      forcedColors: 'active',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.goto('/');
    await page.waitForSelector('#hiw');

    for (const role of ['CLIENT', 'MIDDLEMAN', 'SELLER']) {
      const label = page.locator('#hiw svg text', { hasText: role }).first();
      await expect(label).toHaveCount(1);
      const fill = await label.evaluate((el) =>
        getComputedStyle(el as SVGGraphicsElement).fill,
      );
      // Chromium resolves forced-colors system tokens to concrete rgb()
      // strings — the exact value depends on the HCM palette, but it is
      // never plain transparent-black.
      expect(fill).not.toBe('rgb(0, 0, 0)');
      expect(fill.length).toBeGreaterThan(0);
    }
    await context.close();
  });

  test('prefers-contrast: more — actor wallet text lifts to the primary --text color', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      colorScheme: 'dark',
      contrast: 'more',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.emulateMedia({ contrast: 'more' });
    await page.goto('/');
    await page.waitForSelector('#hiw');

    // The contrast override lives in `_variables.scss`:
    //   @media (prefers-contrast: more) { :root { --hiw-actor-wallet: var(--text); } }
    // Compare the RESOLVED computed fill on a live <text class="hiw__diagActorMuted">
    // node so the assertion doesn't depend on how the browser chooses to
    // stringify `color-mix()` vs a resolved hex at the :root level.
    const walletEl = page
      .locator('#hiw svg text[class*="hiw__diagActorMuted"]')
      .first();
    await expect(walletEl).toHaveCount(1);
    const walletFill = await walletEl.evaluate((el) =>
      getComputedStyle(el as SVGGraphicsElement).fill,
    );
    const textVar = await page.evaluate(() => {
      // Render a probe span and read the resolved --text so we compare
      // apples to apples across browsers that may resolve the computed
      // fill differently from the raw custom property.
      const probe = document.createElement('span');
      probe.style.color = 'var(--text)';
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    });
    expect(walletFill).toBe(textVar);
    await context.close();
  });
});
