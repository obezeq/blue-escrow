// Regression lock: MarketingLayout's <main> must NOT carry an inline
// paddingTop — the v6 fix removed it so the hero stays full-bleed.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/providers/LenisProvider', () => ({
  LenisProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock('@/components/layout/Header', () => ({
  Header: () => null,
}));
vi.mock('@/components/layout/Footer', () => ({
  Footer: () => null,
}));
vi.mock('@/components/layout/SkipLink', () => ({
  SkipLink: () => null,
}));
vi.mock('@/components/layout/ClientEnhancements', () => ({
  ClientEnhancements: () => null,
}));
vi.mock('@/components/ui/ScrollProgressIndicator', () => ({
  ScrollProgressIndicator: () => null,
}));

import MarketingLayout from './layout';

afterEach(cleanup);

describe('(marketing) MarketingLayout', () => {
  it('renders <main id="main-content"> with no inline paddingTop', () => {
    const { container } = render(
      <MarketingLayout>
        <div data-testid="content" />
      </MarketingLayout>,
    );

    const main = container.querySelector('main#main-content');
    expect(main).not.toBeNull();
    expect(main?.hasAttribute('style')).toBe(false);
    const style = main?.getAttribute('style') ?? '';
    expect(style).not.toContain('padding-top');
    expect(style).not.toContain('paddingTop');
  });

  it('renders children inside <main>', () => {
    const { container } = render(
      <MarketingLayout>
        <div data-testid="content" />
      </MarketingLayout>,
    );

    const main = container.querySelector('main#main-content');
    expect(main).not.toBeNull();
    expect(main?.contains(screen.getByTestId('content'))).toBe(true);
  });
});
