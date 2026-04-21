import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock the client animation wrapper
vi.mock('./FeeSectionAnimations', () => ({
  FeeSectionAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { FeeSection } from './FeeSection';

afterEach(() => cleanup());

describe('FeeSection', () => {
  it('renders the percentage number', () => {
    render(<FeeSection />);
    expect(screen.getByLabelText('0.33 percent')).toBeDefined();
    expect(screen.getByLabelText('0.33 percent').textContent).toBe('0.33%');
  });

  it('renders the no-hidden-fees line', () => {
    render(<FeeSection />);
    expect(
      screen.getByText(
        'No hidden fees. No surprises. No geographic restrictions.',
      ),
    ).toBeDefined();
  });

  it('renders the competitor comparison', () => {
    const { container } = render(<FeeSection />);
    const competitor = container.querySelector('.fee__competitor');
    expect(competitor).not.toBeNull();
    expect(competitor?.textContent).toContain('Escrow.com charges 0.89%');
  });

  it('highlights 0.33% in the comparison', () => {
    const { container } = render(<FeeSection />);
    const comparison = container.querySelector('[data-animate="comparison"]');
    const highlight = comparison?.querySelector('span');
    expect(highlight?.textContent).toBe('0.33%');
  });

  it('renders as a semantic section with correct id', () => {
    const { container } = render(<FeeSection />);
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section?.id).toBe('fees');
  });

  it('has aria-label on the section', () => {
    const { container } = render(<FeeSection />);
    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe('Platform fees');
  });
});
