import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeDefined();
  });

  it('renders as article when specified', () => {
    render(<Card as="article">Article card</Card>);
    expect(screen.getByRole('article')).toBeDefined();
  });

  it('applies accent color as CSS variable', () => {
    const { container } = render(
      <Card accentColor="#ff0000">Accented</Card>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.style.getPropertyValue('--card-accent')).toBe('#ff0000');
  });
});
