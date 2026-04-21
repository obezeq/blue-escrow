import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { GrainOverlay } from './GrainOverlay';

afterEach(cleanup);

describe('GrainOverlay', () => {
  it('renders a decorative fixed-position div', () => {
    const { container } = render(<GrainOverlay />);
    const el = container.firstElementChild as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.getAttribute('aria-hidden')).toBe('true');
  });

  it('has no interactive descendants', () => {
    const { container } = render(<GrainOverlay />);
    expect(container.querySelectorAll('button, a, input').length).toBe(0);
  });

  it('carries the grain class so CSS rules apply', () => {
    const { container } = render(<GrainOverlay />);
    const el = container.firstElementChild as HTMLElement | null;
    expect(el?.className).toMatch(/grain/);
  });
});
