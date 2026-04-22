import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('./TheProblemAnimations', () => ({
  TheProblemAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { TheProblem } from './TheProblem';

afterEach(cleanup);

describe('TheProblem (v7)', () => {
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
      screen.getByText(
        (_content, node) =>
          node?.tagName === 'P' &&
          node?.textContent === 'They use a middleman to hold the money.',
      ),
    ).toBeDefined();
    expect(screen.getByText('a stranger too')).toBeDefined();
    expect(screen.getByText('just leaving.')).toBeDefined();
  });

  it('renders the visually-hidden <h2> section heading', () => {
    render(<TheProblem />);
    const heading = screen.getByRole('heading', {
      level: 2,
      name: /the problem with middlemen/i,
    });
    expect(heading).toBeDefined();
    expect(heading.id).toBe('problem-heading');
  });

  it('renders the <h3> "The fix" label', () => {
    render(<TheProblem />);
    expect(
      screen.getByRole('heading', { level: 3, name: /the fix/i }),
    ).toBeDefined();
  });

  it('wraps "a stranger too" in <s data-animate="stranger"> with an inner problem__red span', () => {
    const { container } = render(<TheProblem />);
    const struck = container.querySelector('s');
    expect(struck).not.toBeNull();
    expect(struck?.getAttribute('data-animate')).toBe('stranger');
    const red = struck?.querySelector('span');
    expect(red?.textContent).toBe('a stranger too');
    // Axe disallows aria-label on non-interactive elements without a role
    // (WCAG 4.1.2 aria-prohibited-attr). Native <s> semantics are enough.
    expect(struck?.getAttribute('aria-label')).toBeNull();
    expect(red?.getAttribute('aria-label')).toBeNull();
  });

  it('renders an inline <svg><path/></svg> pen-stroke inside the <s>', () => {
    // The strikethrough is drawn via stroke-dashoffset on an inline SVG
    // child of the <s>. The <svg> must be aria-hidden (decorative) and the
    // <path> must carry pathLength="100" so --strike-progress 0..100
    // maps directly to stroke-dashoffset math.
    const { container } = render(<TheProblem />);
    const svg = container.querySelector('s svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    const path = svg?.querySelector('path');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('stroke-linecap')).toBe('round');
    expect(path?.getAttribute('pathLength')).toBe('100');
    expect(path?.getAttribute('fill')).toBe('none');
    expect(path?.getAttribute('stroke')).toBe('currentColor');
  });

  it('renders <em> for the italic "just leaving." phrase', () => {
    const { container } = render(<TheProblem />);
    const italic = container.querySelector('em');
    expect(italic).not.toBeNull();
    expect(italic?.textContent).toBe('just leaving.');
  });

  it('renders <strong> for "Take the money out of their hands."', () => {
    const { container } = render(<TheProblem />);
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('Take the money out of their hands.');
  });

  it('renders a <dl> with two capability <div> children', () => {
    const { container } = render(<TheProblem />);
    const dl = container.querySelector('dl');
    expect(dl).not.toBeNull();
    const capabilities = container.querySelectorAll('dl > div');
    expect(capabilities.length).toBe(2);
  });

  it('renders capability <dt>/<dd> pairs with correct text (no trailing colon)', () => {
    const { container } = render(<TheProblem />);
    const capabilities = container.querySelectorAll('dl > div');

    const firstDt = capabilities[0]?.querySelector('dt');
    const firstDd = capabilities[0]?.querySelector('dd');
    expect(firstDt?.textContent).toBe('Middleman can');
    expect(firstDd?.textContent?.startsWith('verify the deal')).toBe(true);

    const secondDt = capabilities[1]?.querySelector('dt');
    const secondDd = capabilities[1]?.querySelector('dd');
    expect(secondDt?.textContent).toBe('Middleman cannot');
    expect(secondDd?.textContent?.startsWith('send funds to their own wallet')).toBe(
      true,
    );
  });

  it('applies the negative modifier class to the second capability', () => {
    const { container } = render(<TheProblem />);
    const capabilities = container.querySelectorAll('dl > div');
    const second = capabilities[1] as HTMLElement;
    expect(second.className.includes('problem__capability--negative')).toBe(
      true,
    );
  });

  it('renders the <section> with id="problem" and aria-labelledby="problem-heading"', () => {
    const { container } = render(<TheProblem />);
    const section = container.querySelector('section');
    expect(section?.id).toBe('problem');
    expect(section?.getAttribute('aria-labelledby')).toBe('problem-heading');
  });

  it('does not set a legacy aria-label on the <section>', () => {
    const { container } = render(<TheProblem />);
    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBeNull();
  });
});
