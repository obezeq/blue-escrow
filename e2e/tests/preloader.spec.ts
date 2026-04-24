import { expect, test } from '@playwright/test';

// Homepage Preloader smoke. Exercises three contracts:
//   1. Default render + natural exit + hero becomes visible.
//   2. Reduced-motion users get a static branded still that exits quickly.
//   3. Same-session re-navigation does not replay the intro.

test.describe('Preloader', () => {
  test('mounts as a progressbar, announces progress, and unmounts', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('preloader:done');
      } catch {
        /* noop */
      }
    });
    await page.goto('/');

    const bar = page.getByRole('progressbar', {
      name: 'Loading Blue Escrow',
    });
    await expect(bar).toBeVisible();

    // aria-valuenow should update as progress increases.
    await expect
      .poll(async () => Number(await bar.getAttribute('aria-valuenow')), {
        timeout: 5_000,
      })
      .toBeGreaterThan(10);

    // Overlay should unmount on its own under 6s.
    await expect(bar).toBeHidden({ timeout: 6_000 });
    await expect(page.locator('#hero')).toBeVisible();
  });

  test('reduced-motion skips the preloader entirely', async ({ page }) => {
    // Preloader.tsx:44-52 — when prefers-reduced-motion: reduce matches,
    // the component flips hidden=true on mount so the overlay never
    // renders. The progressbar must never appear; the hero must be
    // immediately accessible.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('preloader:done');
      } catch {
        /* noop */
      }
    });
    await page.goto('/');

    const bar = page.getByRole('progressbar', {
      name: 'Loading Blue Escrow',
    });
    await expect(bar).toBeHidden({ timeout: 2_000 });
    await expect(page.locator('#hero')).toBeVisible();
  });

  test('same-session navigation does not replay the intro', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('preloader:done');
      } catch {
        /* noop */
      }
    });
    await page.goto('/');
    const bar = page.getByRole('progressbar', {
      name: 'Loading Blue Escrow',
    });
    await expect(bar).toBeHidden({ timeout: 6_000 });

    await page.reload();
    // Intro should not re-appear on same-session reload because the session
    // flag was set during the first run.
    await expect(bar).toBeHidden({ timeout: 1_000 });
  });
});
