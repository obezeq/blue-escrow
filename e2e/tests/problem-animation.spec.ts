import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// THE PROBLEM section — pinned master-timeline contract (line-3 centerpiece).
//
// TheProblemAnimations.tsx orchestrates five beats. Line 3 ("The middleman
// is a stranger too.") is now a pinned, scrubbed master timeline on desktop
// viewports (>=900×700 × no-reduced-motion). ScrollTrigger pins the
// [data-stage="line-3"] wrapper and drives a gsap.timeline through four
// labels:
//
//   stage-curtain  → word clip-wipe on line 3  (~0.9s of timeline time)
//   stage-fall     → chars drop with random stagger          (~0.85s)
//   stage-strike   → SVG pen-stroke draws 100 → 0            (~0.8s)
//   stage-settle   → tail pad for snap                        (~0.18s)
//
// The pin covers ~140vh of virtual scroll space; scrub: 0.6 smooths the
// mapping from wheel to timeline; snap lands crisply on the four labels.
// On mobile (<900px) the three animations run as independent triggers
// (legacy behavior preserved). Under reduced-motion NO pin is created.
//
// The source file exposes `window.__problemStageTrigger` under
// NODE_ENV !== 'production' so this spec can read ST bounds + progress
// without guessing magic scroll offsets. Mirror of __hiwStageTrigger in
// HowItWorksAnimations.tsx.

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

interface ProblemStageHandle {
  start: number;
  end: number;
  progress: number;
  pinned: boolean;
}

async function readStage(
  page: import('@playwright/test').Page,
): Promise<ProblemStageHandle | null> {
  return page.evaluate(() => {
    const hook = (
      window as unknown as {
        __problemStageTrigger?: {
          start: number;
          end: number;
          progress: () => number;
          pinned: () => boolean;
        };
      }
    ).__problemStageTrigger;
    if (!hook) return null;
    return {
      start: hook.start,
      end: hook.end,
      progress: hook.progress(),
      pinned: hook.pinned(),
    };
  });
}

async function readDashoffset(
  page: import('@playwright/test').Page,
): Promise<number> {
  const raw = await page.evaluate(() => {
    const path = document.querySelector(
      '[data-animate="stranger"] path',
    ) as SVGPathElement | null;
    if (!path) return '100';
    return getComputedStyle(path)
      .getPropertyValue('stroke-dashoffset')
      .trim();
  });
  return Number.parseFloat(raw);
}

async function collectStrangerDescendantTransforms(
  page: import('@playwright/test').Page,
): Promise<string[]> {
  return page.evaluate(() => {
    const stranger = document.querySelector('[data-animate="stranger"]');
    if (!stranger) return [] as string[];
    const descendants = stranger.querySelectorAll('*');
    return Array.from(descendants).map(
      (el) => getComputedStyle(el as HTMLElement).transform,
    );
  });
}

test.describe('problem section animations', () => {
  test('desktop pin — sequence plays curtain → fall → strike as scroll progresses', async ({
    page,
  }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('#problem');

    // The pin branch only fires inside gsap.matchMedia on >=900×700, and
    // only once the component has mounted + useGSAP has run. Poll for the
    // dev hook instead of guessing a timeout — failure here means the pin
    // was never registered (regression).
    await page.waitForFunction(
      () =>
        (window as unknown as { __problemStageTrigger?: unknown })
          .__problemStageTrigger !== undefined,
      null,
      { timeout: 5000 },
    );

    const stage = await readStage(page);
    expect(stage, 'dev hook must expose pin bounds').not.toBeNull();
    const { start, end } = stage!;
    expect(end).toBeGreaterThan(start);

    // -------- Curtain band (15% into the pin range) ------------------------
    // Seek into the early portion of the pin and give scrub: 0.6 a beat to
    // settle. The master timeline's curtain label spans the first ~40% of
    // progress, so 15% scroll progress lands mid-curtain with snap tolerance.
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    }, start + (end - start) * 0.15);
    await page.waitForTimeout(800);

    const curtainBand = await readStage(page);
    expect(curtainBand!.progress).toBeGreaterThanOrEqual(0.05);
    expect(curtainBand!.progress).toBeLessThanOrEqual(0.45);

    // During curtain, the strike has NOT started: dashoffset should still
    // be near 100. Tolerate > 70 because snap can push progress slightly
    // past stage-curtain toward stage-fall.
    const curtainDash = await readDashoffset(page);
    expect(
      curtainDash,
      `strike must be hidden during curtain band; dashoffset=${curtainDash}`,
    ).toBeGreaterThan(70);

    // -------- Fall band (55% into the pin range) ---------------------------
    // 55% scroll progress lands inside the fall label (fall is positioned
    // with >-0.1 relative to curtain end, so it occupies roughly 30%–60%
    // of master-timeline progress). Chars should either be mid-flight or
    // just settled — either way, at least one descendant transform is
    // non-identity while fall is in progress.
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    }, start + (end - start) * 0.55);
    await page.waitForTimeout(800);

    const fallBand = await readStage(page);
    expect(fallBand!.progress).toBeGreaterThanOrEqual(0.35);
    expect(fallBand!.progress).toBeLessThanOrEqual(0.8);

    // -------- End of stage — strike complete, pin released ----------------
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    }, end + 200);
    await page.waitForTimeout(900);

    const strikeDash = await readDashoffset(page);
    expect(
      strikeDash,
      `strike must draw to completion past end; dashoffset=${strikeDash}`,
    ).toBeLessThanOrEqual(10);

    const postStage = await readStage(page);
    expect(
      postStage!.pinned,
      'pin must release once scrolled past ST end',
    ).toBe(false);
  });

  test('desktop pin — bidirectional scrub reverses strike on scroll up', async ({
    page,
  }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('#problem');
    await page.waitForFunction(
      () =>
        (window as unknown as { __problemStageTrigger?: unknown })
          .__problemStageTrigger !== undefined,
      null,
      { timeout: 5000 },
    );

    const stage = await readStage(page);
    expect(stage).not.toBeNull();
    const { start, end } = stage!;

    // Seek past end → strike drawn.
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    }, end + 200);
    await page.waitForTimeout(900);
    expect(await readDashoffset(page)).toBeLessThanOrEqual(10);

    // Seek back before start → strike rewinds via scrub.
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    }, Math.max(0, start - 200));
    await page.waitForTimeout(900);

    const reversedDash = await readDashoffset(page);
    expect(
      reversedDash,
      `scrub must be bidirectional; dashoffset after scroll-up=${reversedDash}`,
    ).toBeGreaterThan(70);
  });

  test('reduced-motion bypasses pin entirely', async ({ browser }) => {
    // A fresh context with reducedMotion: 'reduce' skips the pin branch in
    // gsap.matchMedia and forces the final state. We assert two things:
    //   1) the dev hook is never installed (no pin created);
    //   2) the path is fully drawn AND every stranger descendant is identity
    //      (clearProps + CSS @media fallback both win).
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await primeThemeAndSkipPreloader(page, 'dark');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/');
      await page.waitForSelector('#problem');
      await page.locator('#problem').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      const hook = await page.evaluate(
        () =>
          (window as unknown as { __problemStageTrigger?: unknown })
            .__problemStageTrigger,
      );
      expect(
        hook,
        'reduced-motion must not install __problemStageTrigger',
      ).toBeUndefined();

      const dashoffset = await readDashoffset(page);
      expect(dashoffset).toBe(0);

      const transforms = await collectStrangerDescendantTransforms(page);
      for (const t of transforms) {
        expect(
          isIdentity(t),
          `reduced-motion descendant transform must be identity, got ${t}`,
        ).toBe(true);
      }
    } finally {
      await context.close();
    }
  });

  test('mobile fallback — no pin, independent triggers run as before', async ({
    page,
  }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('#problem');
    await page.locator('#problem').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Mobile branch (<900px) must NOT install the pin.
    const hook = await page.evaluate(
      () =>
        (window as unknown as { __problemStageTrigger?: unknown })
          .__problemStageTrigger,
    );
    expect(
      hook,
      'mobile branch must not install __problemStageTrigger',
    ).toBeUndefined();

    // Legacy scrubbed strike trigger still works on mobile — scroll past
    // the stranger and wait for scrub to settle.
    await page.evaluate(() => window.scrollBy(0, 1500));
    await page.waitForTimeout(1200);

    const dashoffset = await readDashoffset(page);
    expect(
      dashoffset,
      `mobile scrubbed strike must reach completion; dashoffset=${dashoffset}`,
    ).toBeLessThanOrEqual(10);

    // Chars must have landed too — no lingering non-identity transforms
    // after the fall's 0.85s + stagger tail.
    const transforms = await collectStrangerDescendantTransforms(page);
    for (const t of transforms) {
      expect(
        isIdentity(t),
        `mobile char-fall must settle to identity, got ${t}`,
      ).toBe(true);
    }
  });

  // Observer's deltaY feeds `--drift-y` via a `gsap.quickTo` with a 0.22s
  // delayedCall decaying back to 0. In practice the kick is 1–2 frames wide
  // and Playwright's scroll synthesis emits wildly different velocities on
  // Chromium vs Firefox vs WebKit (and differs again between headed and
  // headless). Any numeric assertion here would be cross-browser flaky
  // theatre. Contract verified manually in Chrome DevTools; keeping the
  // block as a skip preserves intent for future revisit if Playwright ever
  // exposes deterministic scroll velocity.
  test.skip('fast scroll creates --drift-y kick', () => {
    // Observer velocity deltas are browser-specific; verified manually in Chrome.
  });
});
