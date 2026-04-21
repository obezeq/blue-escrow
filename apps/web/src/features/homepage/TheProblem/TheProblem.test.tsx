import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('./TheProblemAnimations', () => ({
  TheProblemAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { TheProblem } from './TheProblem';

afterEach(cleanup);

describe('TheProblem (v6)', () => {
  it('renders the "The problem" eyebrow', () => {
    render(<TheProblem />);
    expect(screen.getByText('The problem')).toBeDefined();
  });

  it('renders all 4 kinetic problem lines', () => {
    render(<TheProblem />);
    expect(
      screen.getByText('Two strangers online agree on a trade.'),
    ).toBeDefined();
    expect(
      screen.getByText('They use a middleman to hold the money.'),
    ).toBeDefined();
    expect(screen.getByText('a stranger too')).toBeDefined();
    expect(screen.getByText('just leaving.')).toBeDefined();
  });

  it('renders the "The fix" answer block', () => {
    render(<TheProblem />);
    expect(screen.getByText('The fix')).toBeDefined();
    expect(
      screen.getByText(/Keep the middleman — they're useful/),
    ).toBeDefined();
    expect(screen.getByText(/Take the money out of their hands/)).toBeDefined();
  });

  it('renders the middleman-can/cannot note', () => {
    render(<TheProblem />);
    expect(screen.getByText('Middleman can:')).toBeDefined();
    expect(screen.getByText('Middleman cannot:')).toBeDefined();
  });

  it('renders as <section id="problem"> with accessible label', () => {
    const { container } = render(<TheProblem />);
    const section = container.querySelector('section');
    expect(section?.id).toBe('problem');
    expect(section?.getAttribute('aria-label')).toBe(
      'The problem with middlemen',
    );
  });
});
