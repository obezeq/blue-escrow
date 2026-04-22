// Axe a11y smoke for <CtaSection /> in both dark and light themes so a
// theme-specific contrast/aria regression in either palette is caught here.
// CtaSectionAnimations is mocked because the SplitText char-rise doesn't
// run cleanly in jsdom.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('./CtaSectionAnimations', () => ({
  CtaSectionAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { CtaSection } from './CtaSection';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe.each(['dark', 'light'] as const)(
  'CtaSection a11y (%s theme)',
  (theme) => {
    beforeEach(() => {
      document.documentElement.dataset.theme = theme;
    });

    it('has no detectable axe violations', async () => {
      const { container } = render(<CtaSection />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('exposes a single h2 heading and two action links (primary + secondary)', () => {
      const { getByRole, getAllByRole } = render(<CtaSection />);
      const h2 = getByRole('heading', { level: 2 });
      expect(h2).not.toBeNull();
      const links = getAllByRole('link');
      // The CTA section has exactly two action links: /app + #hiw
      expect(links.length).toBeGreaterThanOrEqual(2);
      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).toContain('/app');
      expect(hrefs).toContain('#hiw');
    });
  },
);
