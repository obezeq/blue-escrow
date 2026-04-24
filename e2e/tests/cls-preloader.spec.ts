import { expect, test } from '@playwright/test';

// Guards Cumulative Layout Shift (CLS) across the preloader -> hero handoff.
// The intro animation has historically been the riskiest moment for CLS
// regressions: overlays unmount, hero title opacity settles, SplitText swaps
// in char-level spans. Anything that reflows after the LCP window burns our
// Lighthouse budget (maxNumericValue: 0.1).
//
// Strategy: inject a PerformanceObserver before any page script runs, sum
// every `layout-shift` entry that did NOT follow recent user input (CLS
// definition ignores user-initiated shifts), wait until the hero title is
// fully opaque, then give trailing shifts 2s to flush. Budget is 0.05 — half
// the Lighthouse threshold so we catch regressions before they show up in
// LHCI.
test('preloader unmount has CLS < 0.05', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        };
        if (!e.hadRecentInput) {
          (window as unknown as { __cls: number }).__cls += e.value;
        }
      }
    });
    po.observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto('/');

  // Wait for Preloader to flip <html data-preloader="done"> (see
  // apps/web/src/features/homepage/Preloader/Preloader.tsx:104).
  await page.waitForFunction(
    () => document.documentElement.dataset.preloader === 'done',
  );

  // Wait for hero title to fully settle — HeroAnimations fades it in via GSAP
  // after preloader:done fires, so opacity === '1' is the signal that the
  // intro choreography is complete.
  await page.waitForFunction(() => {
    const el = document.querySelector('#hero h1');
    return el ? getComputedStyle(el).opacity === '1' : false;
  });

  // Trailing-shift buffer: browsers can still emit shifts after opacity
  // settles (font swaps, late-loaded SVGs). 2s captures the tail without
  // blowing the 30s test timeout.
  await page.waitForTimeout(2000);

  const cls = await page.evaluate(
    () => (window as unknown as { __cls: number }).__cls,
  );
  expect(cls).toBeLessThan(0.05);
});
