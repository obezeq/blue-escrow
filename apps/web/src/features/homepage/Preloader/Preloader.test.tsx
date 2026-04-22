import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

const { lenisStop, lenisStart } = vi.hoisted(() => ({
  lenisStop: vi.fn(),
  lenisStart: vi.fn(),
}));

vi.mock('lenis/react', () => ({
  useLenis: () => ({ stop: lenisStop, start: lenisStart }),
}));

import { Preloader } from './Preloader';
import { PRELOADER_DONE_EVENT } from '@/lib/preloader/completion';

afterEach(() => {
  cleanup();
  lenisStop.mockClear();
  lenisStart.mockClear();
  delete document.documentElement.dataset.preloader;
  delete document.documentElement.dataset.theme;
  vi.useRealTimers();
});

describe('Preloader — markup + a11y', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders with role="progressbar" and the loading label', () => {
    render(<Preloader />);
    const bar = screen.getByRole('progressbar', { name: 'Loading Blue Escrow' });
    expect(bar).toBeDefined();
  });

  it('initializes aria-valuemin/max/now to 0/100/0', () => {
    render(<Preloader />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });

  it('marks the overlay aria-busy and aria-live="polite"', () => {
    render(<Preloader />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-busy')).toBe('true');
    expect(bar.getAttribute('aria-live')).toBe('polite');
  });

  it('renders the Blue Escrow wordmark as 10 individual letters', () => {
    render(<Preloader />);
    const letters = document.querySelectorAll('#intro [class*="letter"]');
    expect(letters.length).toBe(10);
  });

  it('marks decorative wordmark + bar as aria-hidden', () => {
    render(<Preloader />);
    const mark = document.querySelector('[class*="mark"]');
    const bar = document.querySelector('[class*="bar"]');
    expect(mark?.getAttribute('aria-hidden')).toBe('true');
    expect(bar?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the initializing label, track and 000% counter', () => {
    const { container } = render(<Preloader />);
    expect(container.textContent).toContain('Initializing protocol');
    expect(container.textContent).toContain('000%');
    expect(container.querySelector('[class*="track"] i')).not.toBeNull();
  });
});

describe('Preloader — lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('sets data-preloader="active" on <html> while mounted', () => {
    render(<Preloader />);
    expect(document.documentElement.dataset.preloader).toBe('active');
  });

  it('locks Lenis on mount and releases after the intro finishes', () => {
    render(<Preloader />);
    expect(lenisStop).toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(lenisStart).toHaveBeenCalled();
  });

  it('unmounts itself after the intro duration', () => {
    render(<Preloader />);
    expect(screen.getByRole('progressbar')).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('fires preloader:done when the intro completes', () => {
    const handler = vi.fn();
    document.addEventListener(PRELOADER_DONE_EVENT, handler);
    render(<Preloader />);
    expect(handler).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(handler).toHaveBeenCalled();
    document.removeEventListener(PRELOADER_DONE_EVENT, handler);
  });

  it('re-renders on reload (no session gating)', () => {
    // Simulate a previous visit that already completed the intro.
    document.documentElement.dataset.preloader = 'done';
    render(<Preloader />);
    expect(screen.getByRole('progressbar')).toBeDefined();
  });
});
