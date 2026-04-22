import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

const { lenisStop, lenisStart, animationsOnComplete } = vi.hoisted(() => ({
  lenisStop: vi.fn(),
  lenisStart: vi.fn(),
  animationsOnComplete: { current: null as (() => void) | null },
}));

vi.mock('lenis/react', () => ({
  useLenis: () => ({
    stop: lenisStop,
    start: lenisStart,
  }),
}));

// The animations wrapper is a no-op in tests; it captures the onComplete
// prop so individual tests can invoke the completion callback explicitly.
vi.mock('./PreloaderAnimations', () => ({
  PreloaderAnimations: (p: { onComplete: () => void }) => {
    animationsOnComplete.current = p.onComplete;
    return null;
  },
}));

import { Preloader } from './Preloader';
import {
  PRELOADER_DONE_EVENT,
  PRELOADER_SESSION_KEY,
} from '@/lib/preloader/completion';

afterEach(() => {
  cleanup();
  lenisStop.mockClear();
  lenisStart.mockClear();
  animationsOnComplete.current = null;
  delete document.documentElement.dataset.preloader;
  try {
    sessionStorage.removeItem(PRELOADER_SESSION_KEY);
  } catch {
    /* noop */
  }
});

describe('Preloader — accessibility', () => {
  it('exposes role="progressbar" on the root', () => {
    render(<Preloader />);
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('names the progressbar for screen readers', () => {
    render(<Preloader />);
    expect(
      screen.getByRole('progressbar').getAttribute('aria-label'),
    ).toBe('Loading Blue Escrow');
  });

  it('initializes aria-valuenow/min/max to 0/0/100', () => {
    render(<Preloader />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });

  it('marks the overlay aria-busy while visible', () => {
    render(<Preloader />);
    expect(
      screen.getByRole('progressbar').getAttribute('aria-busy'),
    ).toBe('true');
  });

  it('sets aria-live="polite" so loading is announced without interrupting', () => {
    render(<Preloader />);
    expect(
      screen.getByRole('progressbar').getAttribute('aria-live'),
    ).toBe('polite');
  });

  it('does not leak heading elements (h1/h2/h3)', () => {
    render(<Preloader />);
    expect(document.querySelectorAll('h1, h2, h3').length).toBe(0);
  });

  it('marks the wordmark aria-hidden to avoid duplicate announcement', () => {
    const { container } = render(<Preloader />);
    const mark = container.querySelector('[class*="mark"]');
    expect(mark?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the Blue Escrow wordmark as two [data-word] spans', () => {
    const { container } = render(<Preloader />);
    const words = container.querySelectorAll('[data-word]');
    expect(words.length).toBe(2);
    expect(words[0]?.textContent).toBe('Blue');
    expect(words[1]?.textContent).toBe('Escrow');
  });
});

describe('Preloader — scroll / interaction lock', () => {
  it('sets data-preloader="active" on <html> while mounted', () => {
    render(<Preloader />);
    expect(document.documentElement.dataset.preloader).toBe('active');
  });

  it('flips data-preloader to "done" on unmount', () => {
    const { unmount } = render(<Preloader />);
    unmount();
    expect(document.documentElement.dataset.preloader).toBe('done');
  });

  it('locks Lenis on mount and releases on unmount', () => {
    const { unmount } = render(<Preloader />);
    expect(lenisStop).toHaveBeenCalledTimes(1);
    unmount();
    expect(lenisStart).toHaveBeenCalledTimes(1);
  });
});

describe('Preloader — completion signal', () => {
  it('dispatches preloader:done when the animations wrapper reports complete', () => {
    const handler = vi.fn();
    document.addEventListener(PRELOADER_DONE_EVENT, handler);
    render(<Preloader />);
    expect(handler).not.toHaveBeenCalled();
    act(() => {
      animationsOnComplete.current?.();
    });
    expect(handler).toHaveBeenCalledTimes(1);
    document.removeEventListener(PRELOADER_DONE_EVENT, handler);
  });

  it('removes itself from the DOM once complete', () => {
    render(<Preloader />);
    expect(screen.getByRole('progressbar')).toBeDefined();
    act(() => {
      animationsOnComplete.current?.();
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('Preloader — session memory', () => {
  beforeEach(() => {
    sessionStorage.setItem(PRELOADER_SESSION_KEY, '1');
  });

  it('skips rendering if the session flag is already set', () => {
    render(<Preloader />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('still fires preloader:done on mount so HeroAnimations starts', () => {
    const handler = vi.fn();
    document.addEventListener(PRELOADER_DONE_EVENT, handler);
    render(<Preloader />);
    expect(handler).toHaveBeenCalledTimes(1);
    document.removeEventListener(PRELOADER_DONE_EVENT, handler);
  });
});

describe('Preloader — theme invariance', () => {
  it('renders identical DOM under [data-theme="light"] and [data-theme="dark"]', () => {
    document.documentElement.dataset.theme = 'light';
    const { container: light } = render(<Preloader />);
    const lightHTML = light.innerHTML;
    cleanup();
    document.documentElement.dataset.theme = 'dark';
    delete document.documentElement.dataset.preloader;
    const { container: dark } = render(<Preloader />);
    expect(dark.innerHTML).toBe(lightHTML);
    delete document.documentElement.dataset.theme;
  });
});
