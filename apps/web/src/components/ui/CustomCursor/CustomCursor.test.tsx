import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CustomCursor } from './CustomCursor';

describe('CustomCursor', () => {
  it('mounts without crashing', () => {
    expect(() => {
      render(<CustomCursor />);
    }).not.toThrow();
  });

  it('renders with aria-hidden', () => {
    const { container } = render(<CustomCursor />);
    expect(container.firstChild?.getAttribute('aria-hidden')).toBe('true');
  });
});
