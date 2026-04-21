import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('./CompareAnimations', () => ({
  CompareAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { Compare } from './Compare';
import { COMPARE_ROWS } from './rows';

afterEach(cleanup);

describe('Compare (v6 .invert)', () => {
  it('renders eyebrow, heading with emphasis, and subtitle', () => {
    render(<Compare />);
    expect(screen.getByText('Compared')).toBeDefined();
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Old escrow held your money');
    expect(heading.querySelector('em')?.textContent).toBe('We hold nothing.');
    expect(
      screen.getByText(/Escrow\.com takes a cut and can freeze your funds/),
    ).toBeDefined();
  });

  it('renders all 4 column headers', () => {
    render(<Compare />);
    expect(screen.getByText('Criteria')).toBeDefined();
    expect(screen.getByText('Escrow.com')).toBeDefined();
    expect(screen.getByText('Telegram middleman')).toBeDefined();
    expect(screen.getByText('Blue Escrow')).toBeDefined();
  });

  it('renders every criterion row', () => {
    render(<Compare />);
    COMPARE_ROWS.forEach((row) => {
      expect(screen.getByText(row.criterion)).toBeDefined();
      expect(screen.getByText(row.escrow.label)).toBeDefined();
      expect(screen.getByText(row.telegram.label)).toBeDefined();
      expect(screen.getByText(row.blueEscrow.label)).toBeDefined();
    });
  });

  it('renders as <section id="compare"> with accessible label', () => {
    const { container } = render(<Compare />);
    const section = container.querySelector('section');
    expect(section?.id).toBe('compare');
    expect(section?.getAttribute('aria-label')).toBe(
      'Compare Blue Escrow to existing options',
    );
  });

  it('exposes a table via role semantics', () => {
    render(<Compare />);
    const table = screen.getByRole('table', { name: 'Comparison table' });
    expect(table).toBeDefined();
  });
});
