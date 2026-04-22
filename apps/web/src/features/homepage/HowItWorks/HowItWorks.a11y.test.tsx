// Axe a11y smoke for <HowItWorks /> in both dark and light themes so a
// theme-specific contrast/aria regression in either palette is caught here.
// Animations are mocked because GSAP + ScrollTrigger don't run cleanly in
// jsdom and they don't affect the static accessibility tree.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('./HowItWorksAnimations', () => ({
  HowItWorksAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { HowItWorks } from './HowItWorks';

// The ledger card is rendered as <aside> inside the <section>. Axe's
// landmark-complementary-is-top-level rule discourages nested complementary
// landmarks, but ARIA permits <aside> nested inside a <section> to label a
// related side-block. We disable that single rule (everything else, including
// contrast, still runs).
const AXE_OPTIONS = {
  rules: {
    'landmark-complementary-is-top-level': { enabled: false },
  },
} as const;

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe.each(['dark', 'light'] as const)(
  'HowItWorks a11y (%s theme)',
  (theme) => {
    beforeEach(() => {
      document.documentElement.dataset.theme = theme;
    });

    it('has no detectable axe violations', async () => {
      const { container } = render(<HowItWorks />);
      const results = await axe(container, AXE_OPTIONS);
      expect(results).toHaveNoViolations();
    });

    it('exposes 5 rail buttons with aria-pressed state', () => {
      const { getAllByRole } = render(<HowItWorks />);
      const buttons = getAllByRole('button');
      expect(buttons.length).toBe(5);
      buttons.forEach((btn) => {
        expect(btn.hasAttribute('aria-pressed')).toBe(true);
      });
    });

    it('exposes the live region for the state chip', () => {
      const { container } = render(<HowItWorks />);
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).not.toBeNull();
    });
  },
);

describe('HowItWorks a11y (no theme dataset)', () => {
  it('renders cleanly when document has no data-theme (SSR pre-hydration)', async () => {
    const { container } = render(<HowItWorks />);
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it('renders the SVG diagram with all data-hiw actor + wire selectors', () => {
    const { container } = render(<HowItWorks />);
    // GSAP timeline targets these — never silently rename them.
    expect(container.querySelector('[data-hiw="actor-client"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="actor-mid"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="actor-seller"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="wire-base-C"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="wire-base-S"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="packet"]')).not.toBeNull();
  });
});
