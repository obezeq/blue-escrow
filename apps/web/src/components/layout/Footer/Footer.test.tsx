import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { Footer } from './Footer';

afterEach(cleanup);

describe('Footer (v6)', () => {
  it('renders the footer landmark', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeDefined();
  });

  it('renders the giant outlined wordmark with italic Escrow emphasis', () => {
    const { container } = render(<Footer />);
    const giant = container.querySelector('[class*="footer__giant"]');
    expect(giant).not.toBeNull();
    expect(giant?.textContent).toMatch(/Blue\s+Escrow\./);
    const emphasis = giant?.querySelector('[class*="footer__giantEmphasis"]');
    expect(emphasis?.textContent).toBe('Escrow.');
  });

  it('renders the v6 tagline verbatim', () => {
    render(<Footer />);
    expect(
      screen.getByText(/Programmable trust for people who trade with strangers/),
    ).toBeDefined();
  });

  it('renders the three v6 link columns (Product, Protocol, Directory)', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('Product')).toBeDefined();
    expect(within(footer).getByText('Protocol')).toBeDefined();
    expect(within(footer).getByText('Directory')).toBeDefined();
  });

  it('renders v6 Product links pointing to section anchors', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(
      within(footer).getByRole('link', { name: 'How it works' }).getAttribute('href'),
    ).toBe('#hiw');
    expect(
      within(footer).getByRole('link', { name: 'Compare' }).getAttribute('href'),
    ).toBe('#compare');
    expect(
      within(footer).getByRole('link', { name: 'Fees' }).getAttribute('href'),
    ).toBe('#fees');
    expect(
      within(footer).getByRole('link', { name: 'Receipts' }).getAttribute('href'),
    ).toBe('#receipts');
  });

  it('renders v6 Protocol links (Contract, Audits, Source, Docs)', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Contract' })).toBeDefined();
    expect(within(footer).getByRole('link', { name: 'Audits' })).toBeDefined();
    expect(within(footer).getByRole('link', { name: 'Source' })).toBeDefined();
    expect(within(footer).getByRole('link', { name: 'Docs' })).toBeDefined();
  });

  it('renders v6 Directory links (middleman discovery + reputation)', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Find a middleman' })).toBeDefined();
    expect(within(footer).getByRole('link', { name: 'Become one' })).toBeDefined();
    expect(within(footer).getByRole('link', { name: 'Leaderboard' })).toBeDefined();
    expect(within(footer).getByRole('link', { name: 'Reputation' })).toBeDefined();
  });

  it('renders the status bar with "All systems operational · Arbitrum"', () => {
    render(<Footer />);
    expect(
      screen.getByText(/All systems operational · Arbitrum/),
    ).toBeDefined();
  });

  it('renders the 4 v6 legal bottom links (Terms, Privacy, Bug bounty, Legal)', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    const legalNav = within(footer).getByRole('navigation', {
      name: /legal/i,
    });
    expect(within(legalNav).getByRole('link', { name: 'Terms' })).toBeDefined();
    expect(within(legalNav).getByRole('link', { name: 'Privacy' })).toBeDefined();
    expect(within(legalNav).getByRole('link', { name: 'Bug bounty' })).toBeDefined();
    expect(within(legalNav).getByRole('link', { name: 'Legal' })).toBeDefined();
  });
});
