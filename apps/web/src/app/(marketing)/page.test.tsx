import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// Stub every client-only animation wrapper so the integration test doesn't
// need to boot GSAP / R3F / Lenis. We only assert structure + order here.
vi.mock('@/features/homepage/ClientShell', () => ({
  ClientShell: () => <div data-section="preloader" />,
}));
vi.mock('@/features/homepage/HeroSection/HeroSection', () => ({
  HeroSection: () => <header id="hero" />,
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

    const sections = Array.from(container.children).map((node) => {
      const el = node as HTMLElement;
      return el.dataset.section ?? el.id;
    });

    expect(sections).toEqual(V6_SECTION_ORDER);
  });
});
