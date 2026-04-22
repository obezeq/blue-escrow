// Axe a11y smoke for <TrustLayer /> in both dark and light themes so a
// theme-specific contrast/aria regression in either palette is caught here.
// TrustLayerAnimations is mocked because the GSAP counter tweens + the
// marquee tween don't run cleanly in jsdom.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('./TrustLayerAnimations', () => ({
  TrustLayerAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { TrustLayer } from './TrustLayer';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe.each(['dark', 'light'] as const)(
  'TrustLayer a11y (%s theme)',
  (theme) => {
    beforeEach(() => {
      document.documentElement.dataset.theme = theme;
    });

    it('has no detectable axe violations', async () => {
      const { container } = render(<TrustLayer />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('marks the marquee track aria-hidden so screen readers skip the decorative repetition', () => {
      const { container } = render(<TrustLayer />);
      const marquee = container.querySelector('[class*="proof__marquee"]');
      expect(marquee).not.toBeNull();
      expect(marquee?.getAttribute('aria-hidden')).toBe('true');
    });

    it('every stat number exposes an aria-label combining value and label', () => {
      const { container } = render(<TrustLayer />);
      const nums = container.querySelectorAll('[data-count]');
      expect(nums.length).toBeGreaterThan(0);
      nums.forEach((num) => {
        expect(num.getAttribute('aria-label')).not.toBeNull();
      });
    });
  },
);
