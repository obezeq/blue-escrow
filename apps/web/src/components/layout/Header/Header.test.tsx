import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { Header } from './Header';

afterEach(cleanup);

describe('Header', () => {
  it('renders the navigation landmark', () => {
    render(<Header />);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeDefined();
  });

  it('renders the logo link to home', () => {
    render(<Header />);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const logo = within(nav).getByText('Blue Escrow');
    expect(logo.closest('a')?.getAttribute('href')).toBe('/');
  });

  it('renders the Launch App CTA', () => {
    render(<Header />);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByText('Launch App')).toBeDefined();
  });

  it('has a hamburger toggle button', () => {
    render(<Header />);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const hamburger = within(nav).getByLabelText('Toggle navigation menu');
    expect(hamburger).toBeDefined();
  });
});
