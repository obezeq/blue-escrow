import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock the client animation wrapper
vi.mock('./TheSolutionAnimations', () => ({
  TheSolutionAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { TheSolution } from './TheSolution';

afterEach(() => cleanup());

describe('TheSolution', () => {
  it('renders the section heading', () => {
    render(<TheSolution />);
    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'Nobody holds the key.',
    });
    expect(heading).toBeDefined();
  });

  it('renders buyer lock text', () => {
    render(<TheSolution />);
    expect(
      screen.getByText('Your money goes into a smart contract.'),
    ).toBeDefined();
    expect(screen.getByText('Not a person. Not a company.')).toBeDefined();
    expect(
      screen.getByText(
        'A program on the blockchain that no one can change.',
      ),
    ).toBeDefined();
  });

  it('renders seller lock text', () => {
    render(<TheSolution />);
    expect(
      screen.getByText(
        'You deliver. The smart contract releases your payment.',
      ),
    ).toBeDefined();
    expect(screen.getByText('No chasing. No hoping.')).toBeDefined();
  });

  it('renders middleman lock text', () => {
    render(<TheSolution />);
    expect(
      screen.getByText('The middleman resolves disputes.'),
    ).toBeDefined();
    expect(
      screen.getByText(
        'But the money? Only the smart contract can move it.',
      ),
    ).toBeDefined();
  });

  it('renders closing statement', () => {
    render(<TheSolution />);
    expect(
      screen.getByText(
        'Protected by the blockchain. Not by promises.',
      ),
    ).toBeDefined();
  });

  it('renders as a semantic section with correct id', () => {
    const { container } = render(<TheSolution />);
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section?.id).toBe('the-solution');
  });

  it('has aria-label on the section', () => {
    const { container } = render(<TheSolution />);
    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe(
      'How your money is protected',
    );
  });
});
