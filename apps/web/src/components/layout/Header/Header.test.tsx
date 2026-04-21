import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { Header } from './Header';

function renderHeader() {
  return render(
    <ThemeProvider>
      <Header />
    </ThemeProvider>,
  );
}

afterEach(cleanup);

describe('Header', () => {
  it('renders the main navigation landmark', () => {
    renderHeader();
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeDefined();
  });

  it('renders the logo link to home', () => {
    renderHeader();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const logo = within(nav).getByText('Escrow').closest('a');
    expect(logo?.getAttribute('href')).toBe('/');
  });

  it('renders all v6 nav links', () => {
    renderHeader();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByText('The problem')).toBeDefined();
    expect(within(nav).getByText('How it works')).toBeDefined();
    expect(within(nav).getByText('Compare')).toBeDefined();
    expect(within(nav).getByText('Fees')).toBeDefined();
    expect(within(nav).getByText('FAQ')).toBeDefined();
  });

  it('includes the ThemeToggle switch', () => {
    renderHeader();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('switch')).toBeDefined();
  });

  it('renders the Launch app CTA', () => {
    renderHeader();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const cta = within(nav).getByText(/Launch app/);
    expect(cta.closest('a')?.getAttribute('href')).toBe('/app');
  });
});
