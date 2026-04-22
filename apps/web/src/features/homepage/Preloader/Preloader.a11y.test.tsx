import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { mockMatchMedia } from '@/test/setup';
import { PRELOADER_SESSION_KEY } from '@/lib/preloader/completion';

vi.mock('lenis/react', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}));

// Keep the animations wrapper inert so we can audit the resting DOM.
vi.mock('./PreloaderAnimations', () => ({
  PreloaderAnimations: () => null,
}));

import { Preloader } from './Preloader';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.preloader;
  try {
    sessionStorage.removeItem(PRELOADER_SESSION_KEY);
  } catch {
    /* noop */
  }
});

describe('Preloader — axe accessibility', () => {
  it('has no axe violations in the default render', async () => {
    const { container } = render(<Preloader />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations under prefers-reduced-motion: reduce', async () => {
    const restore = mockMatchMedia((q) => q.includes('reduce'));
    try {
      const { container } = render(<Preloader />);
      expect(await axe(container)).toHaveNoViolations();
    } finally {
      restore();
    }
  });
});
