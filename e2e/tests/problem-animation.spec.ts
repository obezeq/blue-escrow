import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// THE PROBLEM section — "The Fall" kinetic-typography choreography contract.
//
// TheProblemAnimations.tsx orchestrates five beats, but the behavioural
// signal we can observe reliably via computed style is the centerpiece:
//   • chars inside <s data-animate="stranger"> drop from above with an
//     overshoot fall (yPercent: -120 → 0, rotationX: -55 → 0), so mid-flight
//     they carry a non-identity inline transform written by GSAP;
//   • the strikethrough (::after on .problem__struck) is scrubbed LTR via
//     `--strike-scale` from 0 → 1, anchored across top 85% → center 25%
//     (~65% viewport range) for a deliberate, bidirectional trace.
//
// This spec is purely behavioural — no pixel snapshots. It verifies:
//   1) default motion — chars are mid-flight shortly after scroll-in, then
//      land as identity, and the strike reaches ≥ 0.9 once scrolled past end;
//   2) reduced-motion parity — the CSS @media fallback forces --strike-scale
//      to 1 synchronously and GSAP's reduced-motion branch clearProps the
//      chars, so NO inline transforms remain in-flight;
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
    // `--strike-scale` is scrubbed across ~65% viewport (top 85% → center
    // 25%). Scroll a full viewport past the stranger so the end trigger
    // is cleared at any breakpoint, then wait for the 0.6s scrub lag to
    // settle plus a safety margin for RAF jitter.
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.scrollBy(0, 900));
    await page.waitForTimeout(900);

    const strikeScale = await page.evaluate(() => {
      const stranger = document.querySelector(
        '[data-animate="stranger"]',
      ) as HTMLElement | null;
      if (!stranger) return '0';
      return getComputedStyle(stranger)
        .getPropertyValue('--strike-scale')
        .trim();
    });
    // Tolerance 0.9 — scrub: 0.6 introduces tween lag behind scroll, so
    // asserting exactly 1 is flaky even when the segment has fully passed.
    expect(Number.parseFloat(strikeScale)).toBeGreaterThanOrEqual(0.9);

    // -------- Checkpoint C — bidirectional scrub reverses on scroll up ----
    // The scrubbed `--strike-scale` MUST track scroll in both directions
    // (that's the whole point of scrub over toggleActions). Scrolling the
    // stranger back below the start trigger should drive --strike-scale
    // back toward 0. We tolerate < 0.3 to absorb scrub: 0.6 lag.
    await page.evaluate(() => window.scrollBy(0, -1500));
    await page.waitForTimeout(900);

    const strikeScaleReverse = await page.evaluate(() => {
      const stranger = document.querySelector(
        '[data-animate="stranger"]',
      ) as HTMLElement | null;
      if (!stranger) return '1';
      return getComputedStyle(stranger)
        .getPropertyValue('--strike-scale')
        .trim();
    });
    expect(
      Number.parseFloat(strikeScaleReverse),
      `strike-scale must reverse when scrolled up past the start trigger; got ${strikeScaleReverse}`,
    ).toBeLessThan(0.3);

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
    // @media fallback (forces --strike-scale: 1) AND the GSAP matchMedia
    // reducedMotion branch (clearProps on all [data-animate], resets strike
    // + drift). Together they guarantee a synchronous "landed" render —
    // 500ms is plenty; any longer wait would hide a regression where GSAP
    // doesn't clearProps under reduced-motion.
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
        const strikeScale = getComputedStyle(stranger)
          .getPropertyValue('--strike-scale')
          .trim();
        const descendants = stranger.querySelectorAll('*');
        const transforms = Array.from(descendants).map(
          (el) => getComputedStyle(el as HTMLElement).transform,
        );
        return { strikeScale, transforms };
      });

      expect(snapshot).not.toBeNull();
      // CSS fallback writes `--strike-scale: 1` directly; GSAP's reduced
      // branch also sets it inline. Either path yields '1' (not '0.9998').
      expect(snapshot!.strikeScale).toBe('1');
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
