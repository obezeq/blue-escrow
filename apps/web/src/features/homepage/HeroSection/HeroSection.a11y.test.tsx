// Axe a11y smoke for <HeroSection /> in both dark and light themes so a
// theme-specific contrast/aria regression in either palette is caught here.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('./HeroAnimations', () => ({
  HeroAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { HeroSection } from './HeroSection';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe.each(['dark', 'light'] as const)(
  'HeroSection a11y (%s theme)',
  (theme) => {
    beforeEach(() => {
      document.documentElement.dataset.theme = theme;
    });

    it('has no detectable axe violations', async () => {
      const { container } = render(<HeroSection />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  },
);
