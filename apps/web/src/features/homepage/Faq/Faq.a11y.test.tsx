// Axe a11y smoke for <Faq /> in both dark and light themes so a
// theme-specific contrast/aria regression in either palette is caught here.
// FaqAnimations is mocked because the GSAP scroll reveals don't run cleanly
// in jsdom and they don't affect the static accessibility tree.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('./FaqAnimations', () => ({
  FaqAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { Faq } from './Faq';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe.each(['dark', 'light'] as const)('Faq a11y (%s theme)', (theme) => {
  beforeEach(() => {
    document.documentElement.dataset.theme = theme;
  });

  it('has no detectable axe violations', async () => {
    const { container } = render(<Faq />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('exposes every FAQ question as a button with aria-expanded and aria-controls', () => {
    const { getAllByRole } = render(<Faq />);
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => {
      expect(btn.hasAttribute('aria-expanded')).toBe(true);
      expect(btn.hasAttribute('aria-controls')).toBe(true);
    });
  });

  it('initial state has every panel aria-hidden=true (all collapsed)', () => {
    const { container } = render(<Faq />);
    const panels = container.querySelectorAll('[role="region"][aria-labelledby]');
    expect(panels.length).toBeGreaterThan(0);
    panels.forEach((panel) => {
      expect(panel.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
