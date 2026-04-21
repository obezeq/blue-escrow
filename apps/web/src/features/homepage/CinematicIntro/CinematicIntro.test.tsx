import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock GSAP
vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    matchMedia: () => ({
      add: vi.fn(),
    }),
    fromTo: vi.fn(),
    timeline: () => ({
      to: vi.fn().mockReturnThis(),
    }),
  },
  ScrollTrigger: {
    create: vi.fn(),
  },
  useGSAP: vi.fn(),
}));

// Mock matchMedia
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

import { CinematicIntro } from './CinematicIntro';

afterEach(() => cleanup());

describe('CinematicIntro', () => {
  it('renders section with aria-label', () => {
    render(<CinematicIntro />);
    const section = screen.getByRole('region', { name: 'Introduction' });
    expect(section).toBeDefined();
  });

  it('renders brand text "BLUE ESCROW" in the DOM', () => {
    render(<CinematicIntro />);
    expect(screen.getByText('BLUE ESCROW')).toBeDefined();
  });

  it('renders brand text as an h2', () => {
    render(<CinematicIntro />);
    const heading = screen.getByRole('heading', { level: 2, name: 'BLUE ESCROW' });
    expect(heading).toBeDefined();
  });

  it('renders video overlay as aria-hidden', () => {
    const { container } = render(<CinematicIntro />);
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
  });

  it('renders a canvas element for video', () => {
    const { container } = render(<CinematicIntro />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });
});
