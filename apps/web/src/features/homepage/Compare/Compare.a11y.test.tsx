// Axe a11y smoke for <Compare /> in both dark and light themes so a
// theme-specific contrast/aria regression in either palette is caught here.
// CompareAnimations is mocked because the rotateX card-flip doesn't run
// cleanly in jsdom and the 3D transforms don't affect the a11y tree.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('./CompareAnimations', () => ({
  CompareAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { Compare } from './Compare';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe.each(['dark', 'light'] as const)(
  'Compare a11y (%s theme)',
  (theme) => {
    beforeEach(() => {
      document.documentElement.dataset.theme = theme;
    });

    it('has no detectable axe violations', async () => {
      const { container } = render(<Compare />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders a table with an accessible name and header/row semantics', () => {
      const { getByRole, getAllByRole } = render(<Compare />);
      const table = getByRole('table');
      expect(table.getAttribute('aria-label')).toBe('Comparison table');
      // 4 column headers + N row headers (one <th scope="row"> per row)
      const columnHeaders = getAllByRole('columnheader');
      expect(columnHeaders.length).toBe(4);
      const rowHeaders = getAllByRole('rowheader');
      expect(rowHeaders.length).toBeGreaterThan(0);
    });
  },
);
