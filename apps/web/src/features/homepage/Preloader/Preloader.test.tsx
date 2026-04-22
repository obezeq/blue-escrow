import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';

const { lenisStop, lenisStart } = vi.hoisted(() => ({
  lenisStop: vi.fn(),
  lenisStart: vi.fn(),
}));

vi.mock('lenis/react', () => ({
  useLenis: () => ({ stop: lenisStop, start: lenisStart }),
}));

import { Preloader } from './Preloader';
import { PRELOADER_DONE_EVENT } from '@/lib/preloader/completion';

// Baseline & compressed network budgets the Preloader uses internally.
const DEFAULT_BUDGET_MS = 2800 + 1100 + 120;
const SLOW_NET_BUDGET_MS = 1600;

// Install a stub `navigator.connection` for the adaptive-budget path.
// The Navigator type doesn't expose `connection`, so cast through the
// same `unknown -> Navigator & { connection?: ... }` shape the source uses.
function installConnection(effectiveType?: '2g' | 'slow-2g' | '3g' | '4g') {
  const original = (
    navigator as Navigator & { connection?: { effectiveType?: string } }
  ).connection;
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    writable: true,
    value: effectiveType ? { effectiveType } : undefined,
  });
  return () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      writable: true,
      value: original,
    });
  };
}

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

  it('renders an accessible "Skip preloader" button alongside the overlay', () => {
    render(<Preloader />);
    const skip = screen.getByRole('button', { name: 'Skip preloader' });
    expect(skip).toBeDefined();
    expect(skip.tagName).toBe('BUTTON');
    expect(skip.getAttribute('type')).toBe('button');
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
      vi.advanceTimersByTime(DEFAULT_BUDGET_MS + 100);
    });
    expect(lenisStart).toHaveBeenCalled();
  });

  it('unmounts itself after the intro duration', () => {
    render(<Preloader />);
    expect(screen.getByRole('progressbar')).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(DEFAULT_BUDGET_MS + 100);
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('fires preloader:done exactly once when the intro completes', () => {
    const handler = vi.fn();
    document.addEventListener(PRELOADER_DONE_EVENT, handler);
    render(<Preloader />);
    expect(handler).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(DEFAULT_BUDGET_MS + 100);
    });
    // The old implementation fired twice (timeout path + hidden-effect
    // path). Guarded by `isPreloaderDone()`, we now expect exactly one.
    expect(handler).toHaveBeenCalledTimes(1);
    document.removeEventListener(PRELOADER_DONE_EVENT, handler);
  });

  it('re-renders on reload (no session gating)', () => {
    document.documentElement.dataset.preloader = 'done';
    render(<Preloader />);
    expect(screen.getByRole('progressbar')).toBeDefined();
  });
});

describe('Preloader — adaptive timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('compresses the intro budget on slow-2g networks', () => {
    const restore = installConnection('slow-2g');
    try {
      render(<Preloader />);
      expect(screen.getByRole('progressbar')).toBeDefined();
      // The overlay should still be mounted at T = default - 100
      // (because we're using the SHORTENED budget now, not the default).
      // Advance just past the slow-net budget → it should be gone.
      act(() => {
        vi.advanceTimersByTime(SLOW_NET_BUDGET_MS + 50);
      });
      expect(screen.queryByRole('progressbar')).toBeNull();
    } finally {
      restore();
    }
  });

  it('uses the default budget when no network hint is available', () => {
    const restore = installConnection(undefined);
    try {
      render(<Preloader />);
      act(() => {
        // Halfway through the default budget, the slow-net budget has
        // already elapsed — overlay must still be present.
        vi.advanceTimersByTime(SLOW_NET_BUDGET_MS + 100);
      });
      expect(screen.queryByRole('progressbar')).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_BUDGET_MS);
      });
      expect(screen.queryByRole('progressbar')).toBeNull();
    } finally {
      restore();
    }
  });
});

describe('Preloader — skip control', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('click on skip dismisses the overlay immediately', () => {
    render(<Preloader />);
    const skip = screen.getByRole('button', { name: 'Skip preloader' });
    act(() => {
      fireEvent.click(skip);
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('click on skip emits preloader:done exactly once (no double-fire)', () => {
    const handler = vi.fn();
    document.addEventListener(PRELOADER_DONE_EVENT, handler);
    render(<Preloader />);
    const skip = screen.getByRole('button', { name: 'Skip preloader' });
    act(() => {
      fireEvent.click(skip);
    });
    // Let the scheduled budget timeout also elapse — `finish()` is
    // guarded by `isPreloaderDone()` so it must not re-fire.
    act(() => {
      vi.advanceTimersByTime(DEFAULT_BUDGET_MS + 100);
    });
    expect(handler).toHaveBeenCalledTimes(1);
    document.removeEventListener(PRELOADER_DONE_EVENT, handler);
  });

  it('Enter key on skip dismisses the overlay', () => {
    render(<Preloader />);
    const skip = screen.getByRole('button', { name: 'Skip preloader' });
    act(() => {
      fireEvent.keyDown(skip, { key: 'Enter' });
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('Space key on skip dismisses the overlay', () => {
    render(<Preloader />);
    const skip = screen.getByRole('button', { name: 'Skip preloader' });
    act(() => {
      fireEvent.keyDown(skip, { key: ' ' });
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
