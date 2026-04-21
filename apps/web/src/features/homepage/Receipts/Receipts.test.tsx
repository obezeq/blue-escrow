import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('./ReceiptsAnimations', () => ({
  ReceiptsAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { Receipts } from './Receipts';
import { RECEIPTS_CARDS } from './cards';

afterEach(cleanup);

describe('Receipts (v6)', () => {
  it('renders eyebrow + heading with emphasis + subtitle', () => {
    render(<Receipts />);
    expect(screen.getByText('Receipts')).toBeDefined();
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Every deal mints');
    expect(heading.querySelector('em')?.textContent).toBe('three receipts.');
    expect(screen.getByText(/Not collectibles\. Not art/)).toBeDefined();
  });

  it('renders all 3 receipt cards with their header labels', () => {
    render(<Receipts />);
    RECEIPTS_CARDS.forEach((card) => {
      expect(screen.getByText(card.headerLabel)).toBeDefined();
      expect(screen.getByText(card.headerMeta)).toBeDefined();
      expect(screen.getByText(card.metaLine)).toBeDefined();
      expect(screen.getByText(card.hash)).toBeDefined();
    });
  });

  it('wraps each card in a focusable <article>', () => {
    const { container } = render(<Receipts />);
    const articles = container.querySelectorAll('article');
    expect(articles.length).toBe(3);
  });

  it('renders h3 titles for each card', () => {
    render(<Receipts />);
    const titles = screen.getAllByRole('heading', { level: 3 });
    expect(titles.length).toBe(3);
    expect(titles[0]?.textContent).toContain('Middleman');
    expect(titles[1]?.textContent).toContain('Paid');
    expect(titles[2]?.textContent).toContain('Delivered');
  });

  it('renders as <section id="receipts"> with accessible label', () => {
    const { container } = render(<Receipts />);
    const section = container.querySelector('section');
    expect(section?.id).toBe('receipts');
    expect(section?.getAttribute('aria-label')).toBe(
      'On-chain receipts minted per deal',
    );
  });
});
