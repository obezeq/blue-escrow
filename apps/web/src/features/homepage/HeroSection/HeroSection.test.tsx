import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('./HeroAnimations', () => ({
  HeroAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { HeroSection } from './HeroSection';

afterEach(cleanup);

describe('HeroSection (v6)', () => {
  it('renders the three eyebrow chips', () => {
    render(<HeroSection />);
    expect(screen.getByText('Escrow Protocol v1.0')).toBeDefined();
    expect(screen.getByText('Live on Arbitrum')).toBeDefined();
    expect(screen.getByText('214 deals this month')).toBeDefined();
  });

  it('renders the v6 two-line title with italic emphasis on "that cannot"', () => {
    render(<HeroSection />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('The middleman');
    expect(h1.textContent).toContain('that cannot');
    expect(h1.textContent).toContain('run.');
    const italicWord = Array.from(h1.querySelectorAll('span')).find((el) =>
      el.className.includes('italic'),
    );
    expect(italicWord?.textContent).toBe('that cannot');
  });

  it('renders the subtitle with <b> smart contract + <em> emphasis', () => {
    render(<HeroSection />);
    expect(
      screen.getByText(/Escrow with a real human middleman/),
    ).toBeDefined();
    expect(screen.getByText('smart contract')).toBeDefined();
    expect(
      screen.getByText('Nobody can disappear with your funds.'),
    ).toBeDefined();
  });

  it('renders both CTA links with their v6 targets', () => {
    render(<HeroSection />);
    const primary = screen.getByRole('link', { name: /Start a deal/ });
    expect(primary.getAttribute('href')).toBe('#closing');
    const ghost = screen.getByRole('link', { name: 'See how it works' });
    expect(ghost.getAttribute('href')).toBe('#hiw');
  });

  it('renders all 4 meta columns with their labels', () => {
    render(<HeroSection />);
    expect(screen.getByText('Money held by')).toBeDefined();
    expect(screen.getByText('Decided by')).toBeDefined();
    expect(screen.getByText('Protocol fee')).toBeDefined();
    expect(screen.getByText('Avg settlement')).toBeDefined();
    expect(screen.getByText('Smart contract')).toBeDefined();
    expect(screen.getByText('Human middleman')).toBeDefined();
  });

  it('renders the ticker with duplicated track for seamless loop', () => {
    const { container } = render(<HeroSection />);
    const track = container.querySelector('[class*="ticker__track"]');
    expect(track).not.toBeNull();
    // v6 ticker has 2 "Deal #4821 signed" entries per copy; duplicated => 4
    expect(container.textContent?.match(/Deal #4821 signed/g)?.length).toBe(4);
  });

  it('renders as <section id="hero"> with accessible label', () => {
    const { container } = render(<HeroSection />);
    const section = container.querySelector('section#hero');
    expect(section).not.toBeNull();
    expect(section?.getAttribute('aria-label')).toBe(
      'Decentralized escrow protocol',
    );
  });
});
