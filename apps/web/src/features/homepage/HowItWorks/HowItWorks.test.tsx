import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock the client animation wrapper
vi.mock('./HowItWorksAnimations', () => ({
  HowItWorksAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { HowItWorks } from './HowItWorks';

afterEach(() => cleanup());

describe('HowItWorks', () => {
  it('renders the section heading', () => {
    render(<HowItWorks />);
    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'How it works',
    });
    expect(heading).toBeDefined();
  });

  it('renders all five step titles', () => {
    render(<HowItWorks />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Create' }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Sign' }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Deposit' }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Deliver' }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Resolve' }),
    ).toBeDefined();
  });

  it('renders all five step descriptions', () => {
    render(<HowItWorks />);
    expect(
      screen.getByText(
        'Any party creates a deal on-chain. Invite others by wallet or link.',
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        'All three parties confirm with their wallet. Terms locked on-chain.',
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        'The buyer sends USDC directly to the smart contract.',
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        'The seller delivers. Both parties confirm completion.',
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        'Funds released to the seller. NFT receipts minted for all parties.',
      ),
    ).toBeDefined();
  });

  it('renders step numbers', () => {
    render(<HowItWorks />);
    expect(screen.getByText('01')).toBeDefined();
    expect(screen.getByText('02')).toBeDefined();
    expect(screen.getByText('03')).toBeDefined();
    expect(screen.getByText('04')).toBeDefined();
    expect(screen.getByText('05')).toBeDefined();
  });

  it('uses an ordered list for semantic step ordering', () => {
    render(<HowItWorks />);
    const list = screen.getByRole('list');
    expect(list).toBeDefined();
    expect(list.tagName).toBe('OL');
  });

  it('renders as a semantic section with correct id', () => {
    const { container } = render(<HowItWorks />);
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section?.id).toBe('how-it-works');
  });

  it('has aria-label on the section', () => {
    const { container } = render(<HowItWorks />);
    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe(
      'How it works in five steps',
    );
  });
});
