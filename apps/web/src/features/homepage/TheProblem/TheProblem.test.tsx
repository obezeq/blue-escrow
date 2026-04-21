import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock the client animation wrapper
vi.mock('./TheProblemAnimations', () => ({
  TheProblemAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { TheProblem } from './TheProblem';

afterEach(() => cleanup());

describe('TheProblem', () => {
  it('renders kinetic text lines', () => {
    render(<TheProblem />);
    expect(screen.getByText('Every day,')).toBeDefined();
    expect(screen.getByText('someone trusts a stranger')).toBeDefined();
    expect(screen.getByText('with their money.')).toBeDefined();
  });

  it('renders the kinetic text as a single h2', () => {
    render(<TheProblem />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Every day,');
    expect(heading.textContent).toContain('with their money.');
  });

  it('renders impact verdict', () => {
    render(<TheProblem />);
    expect(screen.getByText('And no one can stop it.')).toBeDefined();
  });

  it('renders counter with final value', () => {
    render(<TheProblem />);
    expect(screen.getByText('$2.1B')).toBeDefined();
  });

  it('renders caption text', () => {
    render(<TheProblem />);
    expect(
      screen.getByText('lost to escrow and middleman fraud'),
    ).toBeDefined();
  });

  it('has aria-label on the stat for accessibility', () => {
    render(<TheProblem />);
    expect(screen.getByLabelText('$2.1 billion')).toBeDefined();
  });

  it('renders as a semantic section with correct id', () => {
    const { container } = render(<TheProblem />);
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section?.id).toBe('the-problem');
  });

  it('has aria-label on the section', () => {
    const { container } = render(<TheProblem />);
    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe(
      'The problem with trust',
    );
  });
});
