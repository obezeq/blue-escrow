import { expect, test } from '@playwright/test';
import { primeThemeAndSkipPreloader } from './_utils/prime-theme';

// Refs #99. Guards the responsive typography inside the Live Contract View.
// The SVG text uses `clamp(min, Ncqi, max)` rules driven by
// `container-type: inline-size` on `.hiw__sceneBody` — so the sizes scale
// with the scene-card width, not the viewport. This spec asserts the
// computed font-size on real DOM at four viewport widths so a regression
// in the SCSS clamp or the container-type declaration fails fast.
//
// We keep an `opacity: 1` override on the actor <g> so the computed style
// resolves even before the GSAP timeline activates (matchMedia reduce
// path keeps them at 0 otherwise). The override is injected via a style
// tag so it doesn't pollute production code.
//
// Target curves (dark theme, 1440x900 example):
//   role label:   clamp(15px, 3.0cqi, 24px)
//   actor name:   clamp(18px, 3.4cqi, 28px)
//   wallet/muted: clamp(14px, 2.2cqi, 18px)
//   sceneHead:    clamp(15px, 2.2cqi, 20px)

const VIEWPORTS = [
  { label: '1920', width: 1920, height: 1080, minRole: 18, minName: 22 },
  { label: '1440', width: 1440, height: 900, minRole: 16, minName: 20 },
  { label: '1280', width: 1280, height: 900, minRole: 15, minName: 18 },
  { label: '1024', width: 1024, height: 900, minRole: 15, minName: 18 },
] as const;

for (const vp of VIEWPORTS) {
  test(`HIW live contract view — fonts respond at ${vp.label}x${vp.height}`, async ({
    page,
  }) => {
    await primeThemeAndSkipPreloader(page, 'dark');
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await page.waitForSelector('#hiw');

    // Force-visible actors so computed fills/sizes resolve immediately.
    await page.addStyleTag({
      content: `#hiw svg [data-hiw^="actor-"] { opacity: 1 !important; }`,
    });

    const roleFontSize = await page
      .locator('#hiw svg text', { hasText: 'CLIENT' })
      .first()
      .evaluate((el) =>
        parseFloat(getComputedStyle(el as SVGGraphicsElement).fontSize),
      );
    expect(roleFontSize).toBeGreaterThanOrEqual(vp.minRole);

    const nameFontSize = await page
      .locator('#hiw svg text', { hasText: 'Sofia R.' })
      .first()
      .evaluate((el) =>
        parseFloat(getComputedStyle(el as SVGGraphicsElement).fontSize),
      );
    expect(nameFontSize).toBeGreaterThanOrEqual(vp.minName);

    const sceneHeadFontSize = await page
      .locator('#hiw', { hasText: 'Live contract view' })
      .locator('span', { hasText: /^Live contract view$/i })
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(sceneHeadFontSize).toBeGreaterThanOrEqual(14);
  });
}

test('HIW live contract view — fonts also hold at 2560 ultra-wide', async ({
  page,
}) => {
  await primeThemeAndSkipPreloader(page, 'dark');
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto('/');
  await page.waitForSelector('#hiw');

  await page.addStyleTag({
    content: `#hiw svg [data-hiw^="actor-"] { opacity: 1 !important; }`,
  });

  const roleFontSize = await page
    .locator('#hiw svg text', { hasText: 'CLIENT' })
    .first()
    .evaluate((el) =>
      parseFloat(getComputedStyle(el as SVGGraphicsElement).fontSize),
    );
  // Clamp ceiling 24 — ultra-wide viewport pins to the cap, never overflows.
  expect(roleFontSize).toBeGreaterThanOrEqual(20);
  expect(roleFontSize).toBeLessThanOrEqual(26);
});
