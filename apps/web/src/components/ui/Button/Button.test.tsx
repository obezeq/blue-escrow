import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders as a button element by default', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
  });

  it('renders as an anchor when href is provided', () => {
    render(<Button href="/about">About</Button>);
    const link = screen.getByRole('link', { name: 'About' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/about');
  });

  it('supports disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toHaveProperty('disabled', true);
  });

  it('accepts custom className', () => {
    const { container } = render(
      <Button className="custom">Styled</Button>,
    );
    expect(container.firstChild?.className).toContain('custom');
  });

  it('renders children content', () => {
    render(
      <Button>
        <span>Icon</span> Submit
      </Button>,
    );
    expect(screen.getByText('Icon')).toBeDefined();
    expect(screen.getByRole('button', { name: /Submit/ })).toBeDefined();
  });
});
