import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock ThreeProvider
vi.mock('@/providers/ThreeProvider', () => ({
  useThreeContext: () => ({
    isThreeReady: false,
    setIsThreeReady: vi.fn(),
    vaultState: 'forming',
    setVaultState: vi.fn(),
    currentSectionBg: 'blue',
    setCurrentSectionBg: vi.fn(),
    ctaHovered: false,
    setCtaHovered: vi.fn(),
  }),
}));

// Mock Lenis
vi.mock('lenis/react', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}));

// Mock GSAP
vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    timeline: () => ({
      to: vi.fn().mockReturnThis(),
    }),
    matchMedia: () => ({
      add: vi.fn(),
    }),
  },
  useGSAP: vi.fn(),
}));

// Mock matchMedia
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? false : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

import { Preloader } from './Preloader';

afterEach(() => cleanup());

describe('Preloader', () => {
  it('renders the preloader overlay', () => {
    const { container } = render(<Preloader />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toBeDefined();
    expect(overlay.getAttribute('aria-live')).toBe('polite');
  });

  it('displays a percentage counter', () => {
    render(<Preloader />);
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('renders the pulsing dot', () => {
    const { container } = render(<Preloader />);
    const dot = container.querySelector('[class*="dot"]');
    expect(dot).not.toBeNull();
  });

  it('does not render when prefers-reduced-motion is active', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { container } = render(<Preloader />);
    expect(container.firstChild).toBeNull();
  });
});
