import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';

// Mock LenisProvider's useScrollProgress
vi.mock('@/providers/LenisProvider', () => ({
  useScrollProgress: () => createRef<number>(),
}));

import { ScrollProgressIndicator } from './ScrollProgressIndicator';

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
});
