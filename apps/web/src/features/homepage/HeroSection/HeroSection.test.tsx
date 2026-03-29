import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock the client animation wrapper
vi.mock('./HeroAnimations', () => ({
  HeroAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { HeroSection } from './HeroSection';

afterEach(() => cleanup());

describe('HeroSection', () => {
  it('renders h1 with hero text', () => {
    render(<HeroSection />);
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Money flows. Trust stays.',
    });
    expect(heading).toBeDefined();
  });

  it('renders subtitle text', () => {
    render(<HeroSection />);
    expect(
      screen.getByText(
        /Your money in a smart contract/,
      ),
    ).toBeDefined();
  });

  it('renders "Start a deal" CTA with correct href', () => {
    render(<HeroSection />);
    const link = screen.getByRole('link', { name: 'Start a deal' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/app/deals/new');
  });

  it('renders "See how it works" CTA with anchor link', () => {
    render(<HeroSection />);
    const link = screen.getByRole('link', { name: 'See how it works' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('#the-flow');
  });

  it('renders as a semantic section element', () => {
    const { container } = render(<HeroSection />);
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section?.id).toBe('hero');
  });

  it('has o-section--blue class for blue background', () => {
    const { container } = render(<HeroSection />);
    const section = container.querySelector('section');
    expect(section?.className).toContain('o-section--blue');
  });

  it('has aria-label on the section', () => {
    const { container } = render(<HeroSection />);
    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe('Decentralized escrow');
  });
});
