import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SkipLink } from './SkipLink';

afterEach(cleanup);

describe('SkipLink', () => {
  it('renders as an anchor to #main-content by default', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: /skip to main content/i });
    expect(link.getAttribute('href')).toBe('#main-content');
  });

  it('accepts a custom targetId', () => {
    render(<SkipLink targetId="hiw" />);
    const link = screen.getByRole('link', { name: /skip to main content/i });
    expect(link.getAttribute('href')).toBe('#hiw');
  });

  it('carries the skip CSS module class so visually-hidden styles apply', () => {
    const { container } = render(<SkipLink />);
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.className).toMatch(/skip/);
  });
});
