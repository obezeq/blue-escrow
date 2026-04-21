import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock GSAP
vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    matchMedia: () => ({
      add: vi.fn(),
    }),
    from: vi.fn(),
    set: vi.fn(),
    to: vi.fn(),
  },
  useGSAP: vi.fn(),
}));

vi.mock('@/animations/scrollTrigger/pinnedSection', () => ({
  createPinnedTimeline: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    to: vi.fn().mockReturnThis(),
  })),
}));

// Mock useFlowTimeline as a no-op
vi.mock('./useFlowTimeline', () => ({
  useFlowTimeline: vi.fn(),
}));

import { TheFlow } from './TheFlow';

afterEach(() => cleanup());

describe('TheFlow', () => {
  it('renders the section heading', () => {
    render(<TheFlow />);
    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'The flow of your money',
    });
    expect(heading).toBeDefined();
  });

  it('renders all four phase descriptions', () => {
    render(<TheFlow />);
    expect(screen.getByText('Funds leave the buyer.')).toBeDefined();
    expect(
      screen.getByText('Locked in the smart contract.'),
    ).toBeDefined();
    expect(
      screen.getByText('Released to the seller.'),
    ).toBeDefined();
    expect(
      screen.getAllByText(/0\.33% fee/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders as a semantic section with correct id', () => {
    const { container } = render(<TheFlow />);
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section?.id).toBe('the-flow');
  });

  it('has aria-label on the section', () => {
    const { container } = render(<TheFlow />);
    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe(
      'How your money flows',
    );
  });

  it('renders the SVG trail with role="img"', () => {
    render(<TheFlow />);
    const svg = screen.getByRole('img', {
      name: 'Money flows from buyer through smart contract to seller',
    });
    expect(svg).toBeDefined();
  });

  it('renders node labels in the SVG', () => {
    render(<TheFlow />);
    expect(screen.getByText('Buyer')).toBeDefined();
    expect(screen.getByText('Smart Contract')).toBeDefined();
    expect(screen.getByText('Seller')).toBeDefined();
  });

  it('renders the middleman node', () => {
    render(<TheFlow />);
    expect(screen.getByText('Middleman')).toBeDefined();
  });
});
