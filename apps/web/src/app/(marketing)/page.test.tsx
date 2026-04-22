import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// Stub every client-only animation wrapper so the integration test doesn't
// need to boot GSAP / R3F / Lenis. We only assert structure + order here.
vi.mock('@/features/homepage/ClientShell', () => ({
  ClientShell: () => <div data-section="preloader" />,
}));
vi.mock('@/features/homepage/HeroSection/HeroSection', () => ({
  HeroSection: () => <section id="hero" />,
}));
vi.mock('@/features/homepage/TheProblem/TheProblem', () => ({
  TheProblem: () => <section id="problem" />,
}));
vi.mock('@/features/homepage/HowItWorks/HowItWorks', () => ({
  HowItWorks: () => <section id="hiw" />,
}));
vi.mock('@/features/homepage/Compare', () => ({
  Compare: () => <section id="compare" />,
}));
vi.mock('@/features/homepage/FeeSection/FeeSection', () => ({
  FeeSection: () => <section id="fees" />,
}));
vi.mock('@/features/homepage/TrustLayer/TrustLayer', () => ({
  TrustLayer: () => <section id="proof" />,
}));
vi.mock('@/features/homepage/Receipts', () => ({
  Receipts: () => <section id="receipts" />,
}));
vi.mock('@/features/homepage/Faq', () => ({
  Faq: () => <section id="faq" />,
}));
vi.mock('@/features/homepage/CtaSection/CtaSection', () => ({
  CtaSection: () => <section id="closing" />,
}));

import HomePage from './page';

afterEach(cleanup);

const V6_SECTION_ORDER = [
  'preloader',
  'hero',
  'problem',
  'hiw',
  'compare',
  'fees',
  'proof',
  'receipts',
  'faq',
  'closing',
];

describe('(marketing) HomePage composition', () => {
  it('renders every v6 section in document order', () => {
    const { container } = render(<HomePage />);

    // JSON-LD <script type="application/ld+json"> tags are intentionally
    // rendered as the first children (SEO metadata). They are not sections,
    // so we filter them out before asserting the visible composition order.
    const sections = Array.from(container.children)
      .filter((node) => node.tagName !== 'SCRIPT')
      .map((node) => {
        const el = node as HTMLElement;
        return el.dataset.section ?? el.id;
      });

    expect(sections).toEqual(V6_SECTION_ORDER);
  });

  it('emits FAQPage and Organization JSON-LD before the first section', () => {
    const { container } = render(<HomePage />);

    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    expect(scripts).toHaveLength(2);

    const faqScript = container.querySelector('script[data-ld="faq"]');
    const orgScript = container.querySelector('script[data-ld="organization"]');
    expect(faqScript).not.toBeNull();
    expect(orgScript).not.toBeNull();

    const faqJson = JSON.parse(faqScript!.textContent ?? '{}');
    expect(faqJson['@type']).toBe('FAQPage');
    expect(Array.isArray(faqJson.mainEntity)).toBe(true);
    expect(faqJson.mainEntity.length).toBeGreaterThan(0);

    const orgJson = JSON.parse(orgScript!.textContent ?? '{}');
    expect(orgJson['@type']).toBe('Organization');
    expect(orgJson.name).toBe('Blue Escrow');
    expect(orgJson.sameAs).toContain('https://github.com/obezeq/blue-escrow');
  });
});
