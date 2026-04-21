import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('./HowItWorksAnimations', () => ({
  HowItWorksAnimations: ({
    children,
  }: {
    children: React.ReactNode;
    stageRef: unknown;
    onPhaseChange: (p: 0 | 1 | 2 | 3 | 4) => void;
  }) => <div>{children}</div>,
}));

import { HowItWorks } from './HowItWorks';
import { HIW_STEPS } from './steps';

afterEach(cleanup);

describe('HowItWorks (v6)', () => {
  it('renders the v6 eyebrow + heading with emphasis + subtitle', () => {
    render(<HowItWorks />);
    expect(screen.getByText('How it works')).toBeDefined();
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Three people');
    expect(heading.querySelector('em')?.textContent).toBe('smart contract.');
    expect(
      screen.getByText(/Scroll to watch one deal unfold/),
    ).toBeDefined();
  });

  it('renders all 5 rail buttons with numbers + labels', () => {
    render(<HowItWorks />);
    HIW_STEPS.forEach((s) => {
      expect(screen.getByText(s.rail.num)).toBeDefined();
      expect(screen.getByText(s.rail.label)).toBeDefined();
    });
  });

  it('starts on step 01 with the Meet narration', () => {
    render(<HowItWorks />);
    expect(
      screen.getAllByText(/Step 01 · Meet/).length,
    ).toBeGreaterThanOrEqual(1);
    const narrationTitle = screen.getByRole('heading', { level: 3 });
    expect(narrationTitle.textContent).toContain('Three wallets');
  });

  it('switches the active step when a rail button is clicked', () => {
    render(<HowItWorks />);
    fireEvent.click(screen.getByText('Lock').closest('button')!);
    expect(
      screen.getAllByText(/Step 03 · Lock/).length,
    ).toBeGreaterThanOrEqual(1);
    const narrationTitle = screen.getByRole('heading', { level: 3 });
    expect(narrationTitle.textContent).toContain('The contract');
  });

  it('updates the ledger amount when phase advances to Lock', () => {
    render(<HowItWorks />);
    fireEvent.click(screen.getByText('Lock').closest('button')!);
    expect(screen.getByText('2,400')).toBeDefined();
  });

  it('updates the state chip label per phase', () => {
    render(<HowItWorks />);
    expect(screen.getByText('Draft')).toBeDefined();
    fireEvent.click(screen.getByText('Release').closest('button')!);
    expect(screen.getByText('Released')).toBeDefined();
  });

  it('marks the active rail button with aria-pressed=true', () => {
    render(<HowItWorks />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(buttons[2]!);
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('false');
    expect(buttons[2]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders as <section id="hiw"> with accessible label', () => {
    const { container } = render(<HowItWorks />);
    const section = container.querySelector('section');
    expect(section?.id).toBe('hiw');
    expect(section?.getAttribute('aria-label')).toBe(
      'How it works in five steps',
    );
  });
});
