import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// Full-page axe scan of the homepage in both themes. We disable
// `color-contrast` because mid-tween GSAP opacity states trigger false
// positives (elements animating from 0 -> 1 read as 0 contrast during
// the snapshot window). All other WCAG 2.1 A/AA + best-practice rules
// remain enabled; the gate is: zero serious or critical violations.
//
// The unit-level axe suite (HeroSection / HowItWorks / Receipts / Faq /
// Compare / TrustLayer / CtaSection / Header / Footer) covers contrast
// in jsdom where tween state is static. This spec is the integration
// companion that catches cross-section regressions that only surface
// once the full page composes.

for (const theme of ['dark', 'light'] as const) {
  test(`homepage axe (${theme})`, async ({ page }) => {
    await primeThemeAndSkipPreloader(page, theme);
    await page.goto('/');
    await page.waitForSelector('#hero');
    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'done',
    );
    await page.waitForFunction(() => {
      const el = document.querySelector('#hero h1');
      return el ? getComputedStyle(el).opacity === '1' : false;
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .disableRules(['color-contrast'])
      .analyze();

    const serious = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    );
    expect(serious).toEqual([]);
  });
}
