// Axe a11y smoke for <Footer /> in both dark and light themes so a
// theme-specific contrast/aria regression in either palette is caught here.
// Footer has no animation wrapper to mock — it's a pure Server Component.

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';

import { Footer } from './Footer';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe.each(['dark', 'light'] as const)(
  'Footer a11y (%s theme)',
  (theme) => {
    beforeEach(() => {
      document.documentElement.dataset.theme = theme;
    });

    it('has no detectable axe violations', async () => {
      const { container } = render(<Footer />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('exposes contentinfo landmark with four navigation regions (3 column + 1 legal)', () => {
      const { getByRole, getAllByRole } = render(<Footer />);
      const footer = getByRole('contentinfo');
      expect(footer).not.toBeNull();
      const navs = getAllByRole('navigation');
      // Product + Protocol + Directory + Legal quick-links = 4
      expect(navs.length).toBe(4);
    });
  },
);
