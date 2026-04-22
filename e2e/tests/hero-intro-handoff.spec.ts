import { expect, test } from '@playwright/test';

// Hero intro-to-entry handoff contract (#91).
//
// The preloader and the hero overlap deliberately: at page-absolute t≈2.8s
// the preloader starts its 1.1s clip-path retreat AND fires
// `preloader:exit-start`, which triggers HeroAnimations' master timeline.
// By the time the overlay fully clears at t≈3.92s, the hero has already
// travelled 25–55% through its entry — eliminating the "dead frame" regression
// where the hero would paint in its fully-landed state while the overlay
// retreated over the top of it.
//
// This spec guards that contract from two angles:
//   (A) BEHAVIORAL — the `data-preloader` state machine must progress
//       mounted → exiting → done in order, and `exiting` must be observed
//       BEFORE `done` (proving the exit-start signal fired).
//   (B) VISUAL (computed-style sampling) — at checkpoints within the 1.0s
//       window after exit-start, the hero elements must be transitional:
//         • ticker at t=+100ms must still be near-opacity-0 (position 0.7s,
//           so it hasn't started fading yet);
//         • eyebrow at t=+600ms must be mid-fade (position 0.05s + duration
//           1.0s → ≈55% through);
//         • words at t=+300ms must still carry a positive translateY
//           (position 0.3s, so the tween has barely started).
//
// Crucially we do NOT skip the preloader here — `preloader.spec.ts` already
// covers session-flag short-circuit; this spec must exercise the REAL intro
// timeline. The session flag is explicitly cleared per test. Reduced-motion
// skips the overlay entirely, so this spec skips under that media setting
// (nothing to hand off).

const TIMELINE = {
  // Relative to the moment `data-preloader === 'exiting'` first flips.
  // Positions chosen to catch elements mid-tween without landing on
  // boundary frames that CI clock jitter can blur past. Each checkpoint is
  // the earliest point we can reliably observe a transitional value while
  // still leaving headroom above the "clearly in-flight" floor.
  EARLY_MS: 100, // ticker still fully hidden (position 0.7s)
  WORD_MS: 300, // words ~0–25% into their 1.0s tween (position 0.3s)
  MID_EYEBROW_MS: 400, // eyebrow ~35% through (start 0.05s + dur 1.0s)
  MID_TICKER_MS: 1000, // ticker ~30% through (start 0.7s + dur 1.0s)
  // Total timeline length beyond exit-start: longest = ticker (0.7 + 1.0 = 1.7s).
  // Add a safety buffer for slow CI frame commit.
  SETTLE_BUFFER_MS: 1900,
} as const;

test.describe('Hero intro-to-entry handoff (#91)', () => {
  test.beforeEach(async ({ page }) => {
    // Preloader.tsx checks `sessionStorage['preloader:done']` to short-circuit
    // repeat views. Clear it so the overlay runs its full GSAP timeline and
    // we actually observe the exiting → done transition.
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('preloader:done');
      } catch {
        /* noop — sessionStorage can throw in some sandbox modes */
      }
    });
  });

  test('data-preloader progresses active → exiting → done in order', async ({
    page,
  }) => {
    // Record every `data-preloader` mutation on <html> into an in-page array.
    // Using a plain global (vs. `page.exposeFunction`) avoids the IPC race
    // where the observer fires before the exposed binding finishes attaching
    // — that race swallowed the `'exiting'` transition on our first pass
    // and only the terminal `'done'` made it back to the test.
    //
    // The observer is installed once `DOMContentLoaded` fires so
    // `document.documentElement` is guaranteed to be the real <html> node
    // (not a transient one swapped out by the HTML parser mid-document).
    // Without this, `addInitScript` occasionally attaches to a doc that is
    // later discarded, and every subsequent attribute mutation is silently
    // ignored.
    await page.addInitScript(() => {
      const w = window as unknown as { __preloaderStates: string[] };
      w.__preloaderStates = [];
      const install = () => {
        const html = document.documentElement;
        const record = (s: string | undefined) => {
          if (!s) return;
          const arr = w.__preloaderStates;
          // Dedupe consecutive duplicates so repeated writes of the same
          // value don't pollute the sequence.
          if (arr[arr.length - 1] !== s) arr.push(s);
        };
        record(html.dataset.preloader);
        new MutationObserver(() => record(html.dataset.preloader)).observe(
          html,
          { attributes: true, attributeFilter: ['data-preloader'] },
        );
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
      } else {
        install();
      }
    });

    await page.goto('/');

    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'done',
      { timeout: 8_000 },
    );

    const observed = await page.evaluate(
      () =>
        (window as unknown as { __preloaderStates: string[] })
          .__preloaderStates,
    );

    const exitingIdx = observed.indexOf('exiting');
    const doneIdx = observed.indexOf('done');

    // `exiting` must have fired, and must strictly precede `done`. This is
    // the behavioural proof that `preloader:exit-start` dispatched ahead of
    // `preloader:done` — the contract HeroAnimations depends on. We include
    // the full sequence in the failure message so a regression points at
    // the broken transition instead of a naked `-1`.
    expect(
      exitingIdx,
      `observed sequence: ${JSON.stringify(observed)}`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      doneIdx,
      `observed sequence: ${JSON.stringify(observed)}`,
    ).toBeGreaterThan(exitingIdx);
  });

  test('hero elements are in-flight — never statically landed — during the 1.1s retreat', async ({
    page,
  }) => {
    await page.goto('/');

    // Anchor all timing measurements to the moment exit-start flips the
    // attribute. Polling (instead of waitForFunction + Date.now arithmetic
    // after the fact) keeps the anchor as close to the real event as the
    // evaluate round-trip allows (~ms-granular).
    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'exiting',
      { timeout: 6_000 },
    );
    const exitStartAt = Date.now();

    // Sample once per checkpoint. Each sample pulls computed style for the
    // three elements whose tween positions are most diagnostic.
    type Sample = {
      atMs: number;
      wordTransform: string;
      eyebrowOpacity: string;
      tickerOpacity: string;
      preloaderState: string | null;
    };

    const samples: Sample[] = [];
    const checkpoints = [
      TIMELINE.EARLY_MS,
      TIMELINE.WORD_MS,
      TIMELINE.MID_EYEBROW_MS,
      TIMELINE.MID_TICKER_MS,
    ];

    for (const atMs of checkpoints) {
      const delay = atMs - (Date.now() - exitStartAt);
      if (delay > 0) await page.waitForTimeout(delay);
      const snapshot = await page.evaluate(() => {
        const word = document.querySelector(
          '[class*="hero__word"]',
        ) as HTMLElement | null;
        const eyebrow = document.querySelector(
          '[data-animate="eyebrow"]',
        ) as HTMLElement | null;
        const ticker = document.querySelector(
          '[data-animate="ticker"]',
        ) as HTMLElement | null;
        return {
          wordTransform: word ? getComputedStyle(word).transform : 'none',
          eyebrowOpacity: eyebrow ? getComputedStyle(eyebrow).opacity : '1',
          tickerOpacity: ticker ? getComputedStyle(ticker).opacity : '1',
          preloaderState: document.documentElement.dataset.preloader ?? null,
        };
      });
      samples.push({ atMs, ...snapshot });
    }

    const byAt = (atMs: number) => {
      const s = samples.find((x) => x.atMs === atMs);
      if (!s) throw new Error(`missing sample at ${atMs}ms`);
      return s;
    };

    // EARLY — ticker's timeline position is 0.7s into the hero timeline, so
    // at t=+100ms it should not have started fading yet. Generous ceiling
    // (0.2) absorbs a rogue tween-paint on very fast runners without losing
    // the signal: a fully-landed ticker would report opacity 1.
    const early = byAt(TIMELINE.EARLY_MS);
    expect(Number.parseFloat(early.tickerOpacity)).toBeLessThan(0.2);

    // WORD — at t=+300ms the word tween (position 0.3s, duration 1.0s) has
    // barely started. We parse the matrix and assert the Y translation is
    // still positive (words start at yPercent: 115 → ty > 0px in matrix
    // coordinates before the tween consumes it).
    const word = byAt(TIMELINE.WORD_MS);
    const matrix = word.wordTransform.match(/matrix.*?\(([\d.,\s-]+)\)/);
    if (matrix) {
      const parts = matrix[1]
        .split(',')
        .map((n) => Number.parseFloat(n.trim()));
      // matrix(a, b, c, d, tx, ty): index 5 is ty for a 2D transform.
      // matrix3d has 16 parts — ty there is index 13. Support both rather
      // than assume GSAP's inline write-out form.
      const ty = parts.length === 6 ? parts[5] : parts[13];
      // A fully-landed word reads ty=0. A transitional word reads ty>0.
      // We accept ty === 0 only if the transform is exactly the identity
      // (covered by the fallback below) — any non-identity frame MUST
      // still show downward translation.
      expect(ty).toBeGreaterThan(0);
    } else {
      // No matrix in the computed style means the element was still gated
      // by CSS (transform: translateY(115%)) or GSAP hadn't rendered yet.
      // Either way it is NOT in its final landed state, so the test holds.
      expect(word.wordTransform).not.toBe('matrix(1, 0, 0, 1, 0, 0)');
      expect(word.wordTransform).not.toBe('none');
    }

    // MID-EYEBROW — timeline position 0.05s + duration 1.0s: at t=+400ms
    // we expect ≈35% of its opacity transition. Ceiling is 0.98 (not 1.0)
    // so a fully-landed-already eyebrow — which is the exact regression we
    // guard against — still trips the assertion, while the natural
    // `power3.out` curve (~0.82 at 35% elapsed) has plenty of headroom.
    const mid = byAt(TIMELINE.MID_EYEBROW_MS);
    const eyebrowOp = Number.parseFloat(mid.eyebrowOpacity);
    expect(eyebrowOp).toBeGreaterThan(0.05);
    expect(eyebrowOp).toBeLessThan(0.98);

    // MID-TICKER — at t=+1000ms the ticker (start 0.7s, dur 1.0s) is ~30%
    // through. Bands again kept wide: a fully-invisible ticker (< 0.05)
    // means the timeline stalled; a fully-visible ticker (> 0.9) means
    // the tween landed ahead of schedule.
    const midTicker = byAt(TIMELINE.MID_TICKER_MS);
    const tickerOp = Number.parseFloat(midTicker.tickerOpacity);
    expect(tickerOp).toBeGreaterThan(0.05);
    expect(tickerOp).toBeLessThan(0.9);

    // FINAL — wait for the data-preloader='done' signal AND the last tween
    // (ticker, longest position+duration = 1.7s) to settle. Then every
    // hero element must be fully opaque and untranslated. This is the
    // other guard: the intro must actually complete, not stall mid-flight.
    await page.waitForFunction(
      () => document.documentElement.dataset.preloader === 'done',
      { timeout: 8_000 },
    );
    await page.waitForTimeout(TIMELINE.SETTLE_BUFFER_MS);

    const final = await page.evaluate(() => {
      const eyebrow = document.querySelector(
        '[data-animate="eyebrow"]',
      ) as HTMLElement | null;
      const ticker = document.querySelector(
        '[data-animate="ticker"]',
      ) as HTMLElement | null;
      return {
        eyebrowOpacity: eyebrow ? getComputedStyle(eyebrow).opacity : '0',
        tickerOpacity: ticker ? getComputedStyle(ticker).opacity : '0',
      };
    });
    expect(Number.parseFloat(final.eyebrowOpacity)).toBeCloseTo(1, 1);
    expect(Number.parseFloat(final.tickerOpacity)).toBeCloseTo(1, 1);
  });

  test('reduced-motion — no overlap to test, preloader skips and hero lands immediately', async ({
    page,
  }) => {
    // Preloader.tsx: `prefersReducedMotionAtMount` returns true → initial
    // `hidden=true`, so the overlay never renders and `data-preloader`
    // never flips to `'exiting'`. The handoff-overlap contract is moot
    // here; we only assert the hero is immediately usable, which is the
    // reduced-motion substitute for the handoff.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const bar = page.getByRole('progressbar', {
      name: 'Loading Blue Escrow',
    });
    await expect(bar).toBeHidden({ timeout: 2_000 });
    await expect(page.locator('#hero')).toBeVisible();
    // The hero h1 must be fully opaque (reduced-motion bypasses GSAP tweens
    // via the `MATCH_MEDIA.reducedMotion` branch in HeroAnimations, which
    // clearProps the hidden state).
    await expect
      .poll(
        async () =>
          Number.parseFloat(
            await page
              .locator('#hero h1')
              .evaluate((el) => getComputedStyle(el).opacity),
          ),
        { timeout: 3_000 },
      )
      .toBeGreaterThan(0.95);
  });
});
