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

  it('renders the SoulVisual SVG with its 3 concentric circles in the soul card', () => {
    const { container } = render(<Receipts />);
    const soulSvg = container.querySelector(
      '.receipts__card--soul svg[aria-hidden="true"]',
    );
    expect(soulSvg).not.toBeNull();
    expect(soulSvg?.querySelector('circle[r="72"]')).not.toBeNull();
    expect(soulSvg?.querySelector('circle[r="56"]')).not.toBeNull();
    expect(soulSvg?.querySelector('circle[r="36"]')).not.toBeNull();
  });

  it('renders the ClientVisual checkmark path inside the client card', () => {
    const { container } = render(<Receipts />);
    const clientSvg = container.querySelector(
      '.receipts__card--client svg[aria-hidden="true"]',
    );
    expect(clientSvg).not.toBeNull();
    expect(clientSvg?.querySelector('path[d^="M 68 108"]')).not.toBeNull();
  });

  it('renders the SellerVisual hexagon polygon inside the seller card', () => {
    const { container } = render(<Receipts />);
    const sellerSvg = container.querySelector(
      '.receipts__card--seller svg[aria-hidden="true"]',
    );
    expect(sellerSvg).not.toBeNull();
    expect(sellerSvg?.querySelectorAll('polygon').length).toBeGreaterThanOrEqual(2);
  });

  it('preserves all 3 variant class hooks for SCSS theme overrides', () => {
    const { container } = render(<Receipts />);
    expect(container.querySelector('.receipts__card--soul')).not.toBeNull();
    expect(container.querySelector('.receipts__card--client')).not.toBeNull();
    expect(container.querySelector('.receipts__card--seller')).not.toBeNull();
  });

  it('keeps the SoulVisual SVG strokes wired through currentColor', () => {
    // The migration to currentColor lets the soul card colour propagate down
    // automatically. If anyone reverts to literal hex / rgba, this guards it.
    const { container } = render(<Receipts />);
    const soulSvg = container.querySelector('.receipts__card--soul svg');
    const dashedRing = soulSvg?.querySelector('circle[stroke-dasharray="2 5"]');
    expect(dashedRing?.getAttribute('stroke')).toBe('currentColor');
  });
});
