import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('./FeeSectionAnimations', () => ({
  FeeSectionAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { FeeSection } from './FeeSection';

afterEach(cleanup);

describe('FeeSection (v6 fees)', () => {
  it('renders the giant 0.33% number with aria label', () => {
    render(<FeeSection />);
    const number = screen.getByLabelText('0.33 percent');
    expect(number.textContent?.replace(/\s/g, '')).toMatch(/0\.33%/);
  });

  it('renders the eyebrow "The only fee"', () => {
    render(<FeeSection />);
    expect(screen.getByText('The only fee')).toBeDefined();
  });

  it('renders the v6 heading with italic emphasis', () => {
    render(<FeeSection />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('A third of');
    expect(heading.textContent).toContain("That's the whole number");
    expect(heading.querySelector('em')?.textContent).toBe('a percent.');
  });

  it('renders both body paragraphs', () => {
    render(<FeeSection />);
    expect(
      screen.getByText(/No subscriptions\. No withdrawal fees/),
    ).toBeDefined();
    expect(
      screen.getByText(/The middleman sets their own fee on top/),
    ).toBeDefined();
  });

  it('renders the 3 competitor rates', () => {
    render(<FeeSection />);
    expect(screen.getByText('Escrow.com')).toBeDefined();
    expect(screen.getByText('Upwork')).toBeDefined();
    expect(screen.getByText('Stripe')).toBeDefined();
    expect(screen.getByText(/up to 3\.25%/)).toBeDefined();
    expect(screen.getByText(/up to 20%/)).toBeDefined();
    expect(screen.getByText(/2\.9% \+ 30¢/)).toBeDefined();
  });

  it('renders as <section id="fees"> with accessible label', () => {
    const { container } = render(<FeeSection />);
    const section = container.querySelector('section');
    expect(section?.id).toBe('fees');
    expect(section?.getAttribute('aria-label')).toBe('Platform fees');
  });
});
