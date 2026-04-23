// Axe a11y smoke for <Header /> in both dark and light themes so a
// theme-specific contrast/aria regression in either palette is caught
// here. Header calls `useGSAP()` and registers a ScrollTrigger on mount,
// so we stub @gsap/react's `useGSAP` to a no-op and stub the ScrollTrigger
// facade. The test exercises the static a11y tree only — GSAP behavior is
// covered elsewhere.
//
// Consumes ThemeProvider via `renderWithProviders` because Header renders
// <ThemeToggle /> which calls `useTheme()`; without the provider the tree
// throws "useTheme must be used within ThemeProvider".

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('@gsap/react', () => ({
  useGSAP: () => {},
}));

vi.mock('@/animations/config/gsap-register', () => ({
  ScrollTrigger: {
    create: () => ({
      kill: () => {},
    }),
  },
  gsap: {},
  useGSAP: () => {},
}));

import { Header } from './Header';
import { renderWithProviders } from '@/test/render-with-providers';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe.each(['dark', 'light'] as const)(
  'Header a11y (%s theme)',
  (theme) => {
    beforeEach(() => {
      // Mirror the production flow: cookie-driven SSR sets html[data-theme]
      // to match initialTheme before React mounts. Tests set the dataset so
      // the reconcile effect sees matching state.
      document.documentElement.dataset.theme = theme;
    });

    it('has no detectable axe violations', async () => {
      const { container } = renderWithProviders(<Header />, { initialTheme: theme });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('exposes the main navigation landmark with aria-label "Main navigation"', () => {
      const { getByRole } = renderWithProviders(<Header />, { initialTheme: theme });
      const nav = getByRole('navigation', { name: 'Main navigation' });
      expect(nav).not.toBeNull();
    });

    it('exposes the theme toggle as a role=switch with aria-checked reflecting the active theme', () => {
      const { getByRole } = renderWithProviders(<Header />, { initialTheme: theme });
      const toggle = getByRole('switch');
      expect(toggle).not.toBeNull();
      // dark => aria-checked=false, light => aria-checked=true — asserted
      // synchronously without waiting for any effect, proving the toggle
      // is SSR-aligned from the very first render (no hydration mismatch).
      expect(toggle.getAttribute('aria-checked')).toBe(
        theme === 'light' ? 'true' : 'false',
      );
    });
  },
);
