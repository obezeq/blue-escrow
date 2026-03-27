import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionHeading } from './SectionHeading';

describe('SectionHeading', () => {
  it('renders as h2 by default', () => {
    render(<SectionHeading>Title</SectionHeading>);
    expect(screen.getByRole('heading', { level: 2, name: 'Title' })).toBeDefined();
  });

  it('renders as the specified heading level', () => {
    render(<SectionHeading as="h3">Subtitle</SectionHeading>);
    expect(screen.getByRole('heading', { level: 3, name: 'Subtitle' })).toBeDefined();
  });

  it('accepts custom className', () => {
    const { container } = render(
      <SectionHeading className="custom">Heading</SectionHeading>,
    );
    expect(container.firstChild?.className).toContain('custom');
  });
});
