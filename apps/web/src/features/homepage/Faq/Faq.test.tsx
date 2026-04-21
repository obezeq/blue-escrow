import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('./FaqAnimations', () => ({
  FaqAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { Faq } from './Faq';
import { FAQ_ITEMS } from './questions';

afterEach(cleanup);

describe('Faq (v6 objections)', () => {
  it('renders the eyebrow, heading, and subtitle copy', () => {
    render(<Faq />);
    expect(screen.getByText('Questions')).toBeDefined();
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Answers');
    expect(heading.textContent).toContain('plainly said');
    expect(screen.getByText(/No jargon, no hand-waving/)).toBeDefined();
  });

  it('renders all 6 v6 questions', () => {
    render(<Faq />);
    FAQ_ITEMS.forEach((item) => {
      expect(screen.getByText(item.question)).toBeDefined();
      expect(screen.getByText(item.count)).toBeDefined();
    });
  });

  it('collapses all panels initially (aria-expanded=false)', () => {
    render(<Faq />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((b) => {
      expect(b.getAttribute('aria-expanded')).toBe('false');
    });
  });

  it('toggles the clicked item open and leaves others closed', () => {
    render(<Faq />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]!);
    expect(buttons[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(buttons[1]!.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the open item when clicked again', () => {
    render(<Faq />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]!);
    expect(buttons[2]!.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(buttons[2]!);
    expect(buttons[2]!.getAttribute('aria-expanded')).toBe('false');
  });

  it('switches the open panel when a different item is clicked', () => {
    render(<Faq />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]!);
    fireEvent.click(buttons[3]!);
    expect(buttons[0]!.getAttribute('aria-expanded')).toBe('false');
    expect(buttons[3]!.getAttribute('aria-expanded')).toBe('true');
  });

  it('wires each button to its answer region via aria-controls', () => {
    render(<Faq />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((b) => {
      const controlsId = b.getAttribute('aria-controls');
      expect(controlsId).toBeTruthy();
      const panel = document.getElementById(controlsId!);
      expect(panel).not.toBeNull();
      expect(panel?.getAttribute('aria-labelledby')).toBe(b.id);
    });
  });

  it('renders as <section id="faq"> with accessible label', () => {
    const { container } = render(<Faq />);
    const section = container.querySelector('section');
    expect(section?.id).toBe('faq');
    expect(section?.getAttribute('aria-label')).toBe(
      'Frequently asked questions',
    );
  });
});
