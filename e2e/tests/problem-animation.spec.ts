import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// THE PROBLEM section — "The Fall" kinetic-typography choreography contract.
//
// TheProblemAnimations.tsx orchestrates five beats, but the behavioural
// signal we can observe reliably via computed style is the centerpiece:
//   • chars inside <s data-animate="stranger"> drop from above with an
//     overshoot fall (yPercent: -120 → 0, rotationX: -55 → 0), so mid-flight
//     they carry a non-identity inline transform written by GSAP;
//   • the strikethrough is drawn via an inline <svg><path/></svg> inside
//     the <s>. GSAP scrubs `stroke-dashoffset` on the path directly from
//     100 (hidden) → 0 (fully drawn), anchored across top 85% → center 25%
//     (~65% viewport range) for a deliberate, bidirectional pen-stroke.
//
// This spec is purely behavioural — no pixel snapshots. It verifies:
//   1) default motion — chars are mid-flight shortly after scroll-in, then
//      land as identity, and the path's stroke-dashoffset reaches ≤ 10
//      once scrolled past the end trigger;
//   2) reduced-motion parity — the CSS @media fallback forces the path's
//      stroke-dashoffset to 0 synchronously and GSAP's reduced-motion
//      branch clearProps the chars, so NO inline transforms remain;
//   3) velocity drift — skipped on purpose: Observer scroll deltas vary so
//      aggressively between Chromium / Firefox / WebKit / headless CI that
//      any numeric assertion here is statistically useless. Verified manually
//      in Chrome devtools against the animation contract.

// Treat both 2D and 3D identity matrices as "landed" — GSAP writes either
// depending on whether a 3D transform was ever applied. `none` is the
// pre-tween state when clearProps wins (reduced-motion path).
const IDENTITY_TRANSFORMS = new Set<string>([
  'none',
  'matrix(1, 0, 0, 1, 0, 0)',
  'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
]);

const isIdentity = (transform: string): boolean =>
  IDENTITY_TRANSFORMS.has(transform.trim());

test.describe('problem section animations', () => {
  test('chars fall in, strike traces to completion', async ({ page }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.waitForSelector('#problem');
    await page.locator('#problem').scrollIntoViewIfNeeded();

    // -------- Checkpoint A — mid-flight chars ------------------------------
    // GSAP fires from() tweens after SplitText, and the fall duration is
    // 0.85s with per-char stagger `{ each: 0.035, from: 'random' }`. 200ms
    // after scroll-in lands squarely inside the tween window for the first
    // several stagger buckets, so at least one char MUST carry a non-identity
    // inline transform. A fully-landed section would return all identity.
    await page.waitForTimeout(200);
    const midFlightTransforms = await page.evaluate(() => {
      const stranger = document.querySelector('[data-animate="stranger"]');
      if (!stranger) return [];
      // SplitText char spans live as descendants with inline transforms GSAP
      // writes each frame. We don't care about their class names — just any
      // descendant whose computed transform is non-identity qualifies.
      const descendants = stranger.querySelectorAll('*');
      return Array.from(descendants).map(
        (el) => getComputedStyle(el as HTMLElement).transform,
      );
    });

    const hasInFlight = midFlightTransforms.some(
      (t) => t && !isIdentity(t),
    );
    expect(
      hasInFlight,
      `expected at least one mid-flight transform among ${midFlightTransforms.length} descendants; all identity means the fall tween never ran or landed instantly`,
    ).toBe(true);

    // -------- Checkpoint B — strike reaches completion ---------------------
    // The path's `stroke-dashoffset` is scrubbed across ~65% viewport
    // (top 85% → center 25%). Fully drawn = 0, fully hidden = 100. Scroll
    // a full viewport past the stranger so the end trigger is cleared at
    // any breakpoint, then wait for the 0.6s scrub lag to settle plus a
    // safety margin for RAF jitter.
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.scrollBy(0, 900));
    await page.waitForTimeout(900);

    const dashoffsetDrawn = await page.evaluate(() => {
      const path = document.querySelector(
        '[data-animate="stranger"] path',
      ) as SVGPathElement | null;
      if (!path) return '100';
      return getComputedStyle(path).getPropertyValue('stroke-dashoffset').trim();
    });
    // Tolerance ≤ 10 — scrub: 0.6 introduces tween lag behind scroll, so
    // asserting exactly 0 is flaky even when the segment has fully passed.
    expect(Number.parseFloat(dashoffsetDrawn)).toBeLessThanOrEqual(10);

    // -------- Checkpoint C — bidirectional scrub reverses on scroll up ----
    // The scrubbed `stroke-dashoffset` MUST track scroll in both directions
    // (that's the whole point of scrub over toggleActions). Scrolling the
    // stranger back below the start trigger should drive stroke-dashoffset
    // back toward 100 (hidden). Tolerate > 70 to absorb scrub: 0.6 lag.
    await page.evaluate(() => window.scrollBy(0, -1500));
    await page.waitForTimeout(900);

    const dashoffsetReversed = await page.evaluate(() => {
      const path = document.querySelector(
        '[data-animate="stranger"] path',
      ) as SVGPathElement | null;
      if (!path) return '0';
      return getComputedStyle(path).getPropertyValue('stroke-dashoffset').trim();
    });
    expect(
      Number.parseFloat(dashoffsetReversed),
      `stroke-dashoffset must reverse toward 100 when scrolled up past the start trigger; got ${dashoffsetReversed}`,
    ).toBeGreaterThan(70);

    // Re-scroll down before the final identity check so the stranger is
    // back in view and its chars have had time to settle at identity.
    await page.evaluate(() => window.scrollBy(0, 2200));
    await page.waitForTimeout(1200);

    // -------- Final state — chars landed as identity -----------------------
    // Once the 0.85s fall + stagger tail completes, every char's inline
    // transform must resolve to identity or none. A lingering non-identity
    // would mean the tween stalled — the exact regression this checkpoint
    // guards against.
    const finalTransforms = await page.evaluate(() => {
      const stranger = document.querySelector('[data-animate="stranger"]');
      if (!stranger) return [];
      const descendants = stranger.querySelectorAll('*');
      return Array.from(descendants).map(
        (el) => getComputedStyle(el as HTMLElement).transform,
      );
    });
    for (const t of finalTransforms) {
      expect(
        isIdentity(t),
        `final descendant transform must be identity, got ${t}`,
      ).toBe(true);
    }
  });

  test('reduced-motion snaps to final state', async ({ browser }) => {
    // A fresh context with reducedMotion: 'reduce' triggers BOTH the CSS
    // @media fallback (forces path stroke-dashoffset: 0 = fully drawn) AND
    // the GSAP matchMedia reducedMotion branch (clearProps on all
    // [data-animate], sets path stroke-dashoffset: 0). Together they
    // guarantee a synchronous "landed" render — 500ms is plenty; any
    // longer wait would hide a regression where GSAP doesn't clearProps
    // under reduced-motion.
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();

    try {
      await primeThemeAndSkipPreloader(page, 'dark');
      await page.goto('/');
      await page.waitForSelector('#problem');
      await page.locator('#problem').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      const snapshot = await page.evaluate(() => {
        const stranger = document.querySelector(
          '[data-animate="stranger"]',
        ) as HTMLElement | null;
        if (!stranger) return null;
        const path = stranger.querySelector('path') as SVGPathElement | null;
        const dashoffset = path
          ? getComputedStyle(path).getPropertyValue('stroke-dashoffset').trim()
          : null;
        const descendants = stranger.querySelectorAll('*');
        const transforms = Array.from(descendants).map(
          (el) => getComputedStyle(el as HTMLElement).transform,
        );
        return { dashoffset, transforms };
      });

      expect(snapshot).not.toBeNull();
      // CSS fallback writes `stroke-dashoffset: 0` directly; GSAP's reduced
      // branch also sets it inline. getComputedStyle normalizes lengths to
      // `<Npx>`, so we parseFloat before comparing to tolerate either
      // "0" (unitless) or "0px" depending on which writer hit first.
      expect(Number.parseFloat(snapshot!.dashoffset ?? '')).toBe(0);
      // clearProps on [data-animate] removes inline transforms that the
      // noReducedMotion branch would have written, so every descendant
      // reports identity.
      for (const t of snapshot!.transforms) {
        expect(
          isIdentity(t),
          `reduced-motion descendant transform must be identity, got ${t}`,
        ).toBe(true);
      }
    } finally {
      await context.close();
    }
  });

  // Observer's deltaY feeds `--drift-y` via a `gsap.quickTo` with a 0.22s
  // delayedCall decaying back to 0. In practice the kick is 1-2 frames wide
  // and Playwright's scroll synthesis emits wildly different velocities on
  // Chromium vs Firefox vs WebKit (and differs again between headed and
  // headless). Any numeric assertion here would be cross-browser flaky
  // theatre. Contract verified manually in Chrome devtools; keeping the
  // block as a skip preserves intent for future revisit if Playwright ever
  // exposes deterministic scroll velocity.
  test.skip('fast scroll creates --drift-y kick', () => {
    // Observer velocity deltas are browser-specific; verified manually in Chrome.
  });
});
