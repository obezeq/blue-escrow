// Axe a11y smoke for <Receipts /> in both dark and light themes so a
// theme-specific contrast/aria regression in either palette is caught here.
// ReceiptsAnimations is mocked because the GSAP card-tilt + reveals don't
// run cleanly in jsdom.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('./ReceiptsAnimations', () => ({
  ReceiptsAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { Receipts } from './Receipts';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe.each(['dark', 'light'] as const)(
  'Receipts a11y (%s theme)',
  (theme) => {
    beforeEach(() => {
      document.documentElement.dataset.theme = theme;
    });

    it('has no detectable axe violations', async () => {
      const { container } = render(<Receipts />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders 3 articles each with an h3 inside', () => {
      const { container } = render(<Receipts />);
      const articles = container.querySelectorAll('article');
      expect(articles.length).toBe(3);
      articles.forEach((article) => {
        expect(article.querySelector('h3')).not.toBeNull();
      });
    });

    it('renders the SoulVisual SVG marked aria-hidden in the soul card', () => {
      const { container } = render(<Receipts />);
      const soulCard = container.querySelector('.receipts__card--soul');
      expect(soulCard).not.toBeNull();
      const svg = soulCard?.querySelector('svg[aria-hidden="true"]');
      expect(svg).not.toBeNull();
    });
  },
);

describe('Receipts a11y (theme-agnostic structure)', () => {
  it('preserves all 3 variant class hooks for SCSS theme overrides', () => {
    const { container } = render(<Receipts />);
    expect(container.querySelector('.receipts__card--soul')).not.toBeNull();
    expect(container.querySelector('.receipts__card--client')).not.toBeNull();
    expect(container.querySelector('.receipts__card--seller')).not.toBeNull();
  });

  it('SoulVisual outer ring keeps stroke-opacity at .4 (WCAG SC 1.4.11 margin)', () => {
    // Regression guard: if someone drops the opacity below .4 thinking it's
    // decorative, this test breaks and forces a conscious WCAG re-check.
    const { container } = render(<Receipts />);
    const soulSvg = container.querySelector(
      '.receipts__card--soul svg[aria-hidden="true"]',
    );
    const dashedRing = soulSvg?.querySelector(
      'circle[stroke-dasharray="2 5"]',
    );
    expect(dashedRing?.getAttribute('stroke-opacity')).toBe('.4');
  });
});
