import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { Footer } from './Footer';

afterEach(cleanup);

describe('Footer', () => {
  it('renders the footer landmark', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeDefined();
  });

  it('renders the logo and copyright', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('Blue Escrow')).toBeDefined();
    expect(within(footer).getByText(/© \d{4} Blue Escrow/)).toBeDefined();
  });

  it('renders the Arbitrum badge', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('Built on Arbitrum')).toBeDefined();
  });

  it('renders column headings', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('Product')).toBeDefined();
    expect(within(footer).getByText('Resources')).toBeDefined();
    expect(within(footer).getByText('Legal')).toBeDefined();
  });
});
