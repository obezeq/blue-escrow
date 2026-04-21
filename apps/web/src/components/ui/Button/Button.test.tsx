import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Button } from './Button';

afterEach(cleanup);

describe('Button', () => {
  it('renders as a button element by default', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
  });

  it('defaults type to "button" so it never accidentally submits a parent form', () => {
    render(<Button>No explicit type</Button>);
    const button = screen.getByRole('button', { name: 'No explicit type' });
    expect(button.getAttribute('type')).toBe('button');
  });

  it('honors an explicit type="submit" when provided', () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button.getAttribute('type')).toBe('submit');
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
    expect((container.firstChild as HTMLElement).className).toContain('custom');
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
