import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('./TrustLayerAnimations', () => ({
  TrustLayerAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { TrustLayer } from './TrustLayer';

afterEach(cleanup);

describe('TrustLayer (v6 proof)', () => {
  it('renders eyebrow, heading with emphasis, and subtitle', () => {
    render(<TrustLayer />);
    expect(screen.getByText('Proof')).toBeDefined();
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('The numbers');
    expect(heading.querySelector('em')?.textContent).toBe("aren't a pitch.");
    expect(
      screen.getByText(/Everything below is verifiable at block level/),
    ).toBeDefined();
  });

  it('renders all 4 proof stat labels', () => {
    render(<TrustLayer />);
    expect(screen.getByText('USDC settled')).toBeDefined();
    expect(screen.getByText('Protocol fee')).toBeDefined();
    expect(screen.getByText('Verified middlemen')).toBeDefined();
    expect(screen.getByText('Funds ever lost')).toBeDefined();
  });

  it('renders each stat sub description', () => {
    render(<TrustLayer />);
    expect(screen.getByText('Across 3,214 deals this quarter')).toBeDefined();
    expect(screen.getByText('Flat. No tiers. No hidden cuts.')).toBeDefined();
    expect(screen.getByText('With on-chain reputation')).toBeDefined();
    expect(screen.getByText('Audited. Open-source. Immutable.')).toBeDefined();
  });

  it('carries data-count + data-decimals on each proof number', () => {
    const { container } = render(<TrustLayer />);
    const nums = container.querySelectorAll('[data-count]');
    expect(nums.length).toBe(4);
    expect(nums[0]?.getAttribute('data-count')).toBe('12.4');
    expect(nums[0]?.getAttribute('data-decimals')).toBe('1');
    expect(nums[1]?.getAttribute('data-count')).toBe('0.33');
    expect(nums[1]?.getAttribute('data-decimals')).toBe('2');
    expect(nums[2]?.getAttribute('data-count')).toBe('180');
    expect(nums[3]?.getAttribute('data-count')).toBe('0');
  });

  it('renders 3 marquee phrase spans inside the track', () => {
    const { container } = render(<TrustLayer />);
    const track = container.querySelector('[data-animate="marquee-track"]');
    expect(track).not.toBeNull();
    expect(track?.querySelectorAll('span').length).toBe(3);
    expect(track?.textContent).toContain('TRUSTLESS');
    expect(track?.textContent).toContain('BORDERLESS');
    expect(track?.textContent).toContain('UNCENSORABLE');
  });

  it('renders as <section id="proof"> with accessible label', () => {
    const { container } = render(<TrustLayer />);
    const section = container.querySelector('section');
    expect(section?.id).toBe('proof');
    expect(section?.getAttribute('aria-label')).toBe(
      'Protocol proof and on-chain metrics',
    );
  });
});
