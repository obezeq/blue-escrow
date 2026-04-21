import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('./CtaSectionAnimations', () => ({
  CtaSectionAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { CtaSection } from './CtaSection';

afterEach(cleanup);

describe('CtaSection (v6 closing)', () => {
  it('renders the v6 eyebrow "Ready when you are"', () => {
    render(<CtaSection />);
    expect(screen.getByText('Ready when you are')).toBeDefined();
  });

  it('renders h2 with the v6 closing line and italic emphasis', () => {
    render(<CtaSection />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Trade');
    expect(heading.textContent).toContain('like you trust');
    expect(heading.textContent).toContain('the code, not the person.');
    const em = heading.querySelector('em');
    expect(em?.textContent).toBe('like you trust');
  });

  it('renders primary CTA pointing to /app', () => {
    render(<CtaSection />);
    const link = screen.getByRole('link', { name: /Open your first deal/ });
    expect(link.getAttribute('href')).toBe('/app');
  });

  it('renders secondary CTA linking to #hiw', () => {
    render(<CtaSection />);
    const link = screen.getByRole('link', { name: 'See the flow' });
    expect(link.getAttribute('href')).toBe('#hiw');
  });

  it('renders as <section id="closing"> with accessible label', () => {
    const { container } = render(<CtaSection />);
    const section = container.querySelector('section');
    expect(section?.id).toBe('closing');
    expect(section?.getAttribute('aria-label')).toBe('Get started');
  });
});
