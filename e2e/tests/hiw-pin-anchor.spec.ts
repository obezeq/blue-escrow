import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

const VIEWPORTS = [
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1920x1080', width: 1920, height: 1080 },
] as const;

const THEMES = ['dark', 'light'] as const;

// HowItWorks pin anchor contract (covers issue #94):
//   1. When the ScrollTrigger pin activates, the .hiw__rail nav must be inside
//      the viewport (not below the fold).
//   2. The pin's `start` position matches the stage top in document coordinates
//      (within 1px tolerance).
//   3. Scrubbing through the pin advances the ledger state chip through at
//      least 3 distinct states (Draft -> Signed -> Locked -> ...).

test.describe('HowItWorks pin anchor + phase journey', () => {
  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      test(`${vp.label} ${theme} — rail visible when pin activates; phases advance`, async ({
        page,
      }) => {
        await primeThemeAndSkipPreloader(page, theme);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/');
        await page.waitForFunction(
          () => document.documentElement.dataset.preloader === 'done',
        );
        await page.waitForSelector('#hiw nav[aria-label="How it works step rail"]');

        // 1. Scroll to pin activation point. Pin now activates when the
        //    stage top reaches `--header-height` px below the viewport top
        //    (#96 — the fixed site header covered the ledger at top:top).
        const { stageDocY, headerPx } = await page.evaluate(() => {
          const el = document.querySelector<HTMLElement>(
            '#hiw [class*="hiw__stage"]',
          );
          if (!el) throw new Error('hiw__stage not found');
          const headerRem =
            parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                '--header-height',
              ),
            ) || 4.5;
          const rem =
            parseFloat(getComputedStyle(document.documentElement).fontSize) ||
            16;
          return {
            stageDocY: el.getBoundingClientRect().top + window.scrollY,
            headerPx: headerRem * rem,
          };
        });
        const targetY = stageDocY - headerPx;
        await page.evaluate(
          (y) => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }),
          targetY,
        );
        await page.waitForTimeout(400); // let scrub / snap settle

        // 2. __hiwStageTrigger.start equals stageDocY - headerPx (within 1px).
        const triggerStart = await page.evaluate(() => {
          const hook = (window as unknown as {
            __hiwStageTrigger?: { start: number };
          }).__hiwStageTrigger;
          return hook?.start;
        });
        expect(triggerStart).toBeDefined();
        expect(Math.abs((triggerStart ?? 0) - targetY)).toBeLessThanOrEqual(1);

        // 3. Rail is inside the viewport at the moment of pin activation.
        const railInViewport = await page.evaluate(() => {
          const hook = (window as unknown as {
            __hiwStageTrigger?: { railInViewport: () => boolean };
          }).__hiwStageTrigger;
          return hook?.railInViewport() ?? false;
        });
        expect(railInViewport).toBe(true);

        // Additional DOM-level rail visibility check (belt & suspenders).
        const rail = page.locator(
          '#hiw nav[aria-label="How it works step rail"]',
        );
        const railBox = await rail.boundingBox();
        expect(railBox).not.toBeNull();
        expect(railBox!.y).toBeGreaterThanOrEqual(0);
        expect(railBox!.y + railBox!.height).toBeLessThanOrEqual(vp.height + 1); // +1 for sub-pixel

        // --- Site header must not overlap the ledger header (#96). ---
        const siteHeader = page.locator('header[class*="Header-module"]');
        const siteHeaderBox = await siteHeader.boundingBox();
        expect(siteHeaderBox).not.toBeNull();

        const ledgerHead = page.locator('#hiw [class*="hiw__ledgerHead"]');
        const ledgerHeadBox = await ledgerHead.boundingBox();
        expect(ledgerHeadBox).not.toBeNull();

        expect(ledgerHeadBox!.y).toBeGreaterThanOrEqual(
          siteHeaderBox!.y + siteHeaderBox!.height - 1,
        );

        // --- All 3 actor pucks visible at pin activation (#96). ---
        const actorOpacities = await page.evaluate(() => {
          const actors = Array.from(
            document.querySelectorAll('[data-hiw^="actor-"]'),
          ) as SVGGElement[];
          return actors.map((a) => ({
            dataHiw: a.getAttribute('data-hiw'),
            opacity: parseFloat(window.getComputedStyle(a).opacity),
          }));
        });
        expect(actorOpacities.length).toBe(3);
        for (const actor of actorOpacities) {
          expect(
            actor.opacity,
            `actor ${actor.dataHiw} visible at pin start (opacity >= 0.9)`,
          ).toBeGreaterThanOrEqual(0.9);
        }

        // 4. Scrub through the pin — collect distinct chip states.
        const chip = page.locator(
          '#hiw aside[aria-label^="Escrow"] [aria-live="polite"]',
        );
        const seenStates = new Set<string>();
        const initialState = (await chip.textContent())?.trim() ?? '';
        seenStates.add(initialState);

        for (let step = 0; step < 60; step++) {
          await page.mouse.wheel(0, 80);
          await page.waitForTimeout(100);
          const txt = (await chip.textContent())?.trim() ?? '';
          seenStates.add(txt);
          if (seenStates.size >= 4) break;
        }

        // Expect at least 3 distinct chip states crossed during the scrub.
        // 4 is the tighter bound (Draft/Signed/Locked/Released minus at least one),
        // 3 is the safety bound for CI/Lenis-inertia variability.
        expect(seenStates.size).toBeGreaterThanOrEqual(3);
      });
    }
  }
});
