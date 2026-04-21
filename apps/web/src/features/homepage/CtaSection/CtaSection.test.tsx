import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock the client animation wrapper
vi.mock('./CtaSectionAnimations', () => ({
  CtaSectionAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { CtaSection } from './CtaSection';

afterEach(() => cleanup());

describe('CtaSection', () => {
  it('renders h2 with "Make it flow."', () => {
    render(<CtaSection />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Make it flow.');
  });

  it('renders subtitle text', () => {
    render(<CtaSection />);
    expect(
      screen.getByText('No signup. No email. Just your wallet.'),
    ).toBeDefined();
  });

  it('renders primary CTA linking to /app', () => {
    render(<CtaSection />);
    const link = screen.getByRole('link', { name: 'Connect Wallet' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/app');
  });

  it('renders secondary CTA linking to /docs', () => {
    render(<CtaSection />);
    const link = screen.getByRole('link', { name: 'Read Documentation' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/docs');
  });

  it('renders as a semantic section with correct id', () => {
    const { container } = render(<CtaSection />);
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section?.id).toBe('get-started');
  });

  it('has o-section--blue class for blue background', () => {
    const { container } = render(<CtaSection />);
    const section = container.querySelector('section');
    expect(section?.className).toContain('o-section--blue');
  });

  it('has aria-label on the section', () => {
    const { container } = render(<CtaSection />);
    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe('Get started');
  });

  it('renders decorative FlowTrail echo SVG', () => {
    const { container } = render(<CtaSection />);
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).not.toBeNull();
    const path = svg?.querySelector('path');
    expect(path).not.toBeNull();
  });
});
