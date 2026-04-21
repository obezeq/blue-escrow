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

  it('renders all 4 column headers as native <th scope="col">', () => {
    render(<Compare />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
    expect(headers.map((h) => h.textContent?.trim())).toEqual([
      'Criteria',
      'Escrow.com',
      'Telegram middleman',
      'Blue Escrow',
    ]);
    // Every columnheader must be a <th> with scope="col"
    headers.forEach((h) => {
      expect(h.tagName).toBe('TH');
      expect(h.getAttribute('scope')).toBe('col');
    });
  });

  it('renders every criterion row with native <th scope="row"> + 3 <td>', () => {
    render(<Compare />);
    const rowheaders = screen.getAllByRole('rowheader');
    expect(rowheaders).toHaveLength(COMPARE_ROWS.length);
    rowheaders.forEach((rh, i) => {
      expect(rh.tagName).toBe('TH');
      expect(rh.getAttribute('scope')).toBe('row');
      expect(rh.textContent).toBe(COMPARE_ROWS[i]!.criterion);
    });
    COMPARE_ROWS.forEach((row) => {
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

  it('exposes a native <table> landmark with accessible name', () => {
    const { container } = render(<Compare />);
    const table = screen.getByRole('table', { name: 'Comparison table' });
    expect(table.tagName).toBe('TABLE');
    expect(container.querySelector('table thead')).not.toBeNull();
    expect(container.querySelector('table tbody')).not.toBeNull();
  });
});
