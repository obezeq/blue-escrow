import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { createRef } from 'react';

// Mock LenisProvider's useScrollProgress
vi.mock('@/providers/LenisProvider', () => ({
  useScrollProgress: () => createRef<number>(),
}));

import { ScrollProgressIndicator } from './ScrollProgressIndicator';

afterEach(cleanup);

describe('ScrollProgressIndicator', () => {
  it('renders with progressbar role and label', () => {
    render(<ScrollProgressIndicator />);
    expect(
      screen.getByRole('progressbar', { name: 'Scroll progress' }),
    ).toBeDefined();
  });

  it('contains a bar element', () => {
    const { container } = render(<ScrollProgressIndicator />);
    expect(container.querySelector('[class*="bar"]')).not.toBeNull();
  });

  it('exposes aria-valuemin / aria-valuemax / aria-valuenow per ARIA progressbar spec', () => {
    render(<ScrollProgressIndicator />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('100');
    // Initial value is 0 (no scroll); ticker updates it to current scroll pct
    expect(progressbar.getAttribute('aria-valuenow')).toBe('0');
  });
});
