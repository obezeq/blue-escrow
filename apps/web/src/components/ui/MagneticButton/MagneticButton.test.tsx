import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MagneticButton } from './MagneticButton';

describe('MagneticButton', () => {
  it('renders the inner Button', () => {
    render(<MagneticButton>Launch App</MagneticButton>);
    expect(
      screen.getByRole('button', { name: 'Launch App' }),
    ).toBeDefined();
  });

  it('passes variant through to Button', () => {
    render(
      <MagneticButton variant="secondary">Secondary</MagneticButton>,
    );
    expect(
      screen.getByRole('button', { name: 'Secondary' }),
    ).toBeDefined();
  });

  it('renders as link when href provided', () => {
    render(<MagneticButton href="/app">Go</MagneticButton>);
    expect(screen.getByRole('link', { name: 'Go' })).toBeDefined();
  });
});
