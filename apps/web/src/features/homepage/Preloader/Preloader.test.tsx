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
import {
  PRELOADER_DONE_EVENT,
  PRELOADER_EXIT_START_EVENT,
} from '@/lib/preloader/completion';
import { mockMatchMedia } from '@/test/setup';

// Baseline & compressed network budgets the Preloader uses internally.
const DEFAULT_BUDGET_MS = 2800 + 1100 + 120;
const SLOW_NET_BUDGET_MS = 1600;
// Exit-start offsets (CSS `introOut` kickoff) — compressed on 2g/slow-2g.
const EXIT_START_MS_DEFAULT = 2800;
const EXIT_START_MS_SLOW_NET = 1200;

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

describe('Preloader — exit-start signal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('dispatches preloader:exit-start at 2800ms on default network', () => {
    const exitStartSpy = vi.fn();
    document.addEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
    try {
      render(<Preloader />);
      // Before crossing the threshold: no dispatch yet.
      act(() => {
        vi.advanceTimersByTime(EXIT_START_MS_DEFAULT - 1);
      });
      expect(exitStartSpy).not.toHaveBeenCalled();
      // Cross the threshold: exit-start fires exactly once and data flips.
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(exitStartSpy).toHaveBeenCalledTimes(1);
      // `data-preloader` is either 'exiting' (right at the signal) or 'done'
      // if the hide budget has already elapsed. We only care that it has
      // progressed past 'active'.
      const state = document.documentElement.dataset.preloader;
      expect(['exiting', 'done']).toContain(state);
    } finally {
      document.removeEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
    }
  });

  it('dispatches preloader:exit-start at 1200ms on slow-2g', () => {
    const restore = installConnection('slow-2g');
    const exitStartSpy = vi.fn();
    document.addEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
    try {
      render(<Preloader />);
      // Just before the compressed budget — must not have fired yet.
      act(() => {
        vi.advanceTimersByTime(EXIT_START_MS_SLOW_NET - 1);
      });
      expect(exitStartSpy).not.toHaveBeenCalled();
      // Crossing the compressed threshold fires exit-start (not 2800ms).
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(exitStartSpy).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
      restore();
    }
  });

  it('skip button fires exit-start before done, each exactly once', () => {
    const exitStartSpy = vi.fn();
    const doneSpy = vi.fn();
    document.addEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
    document.addEventListener(PRELOADER_DONE_EVENT, doneSpy);
    try {
      render(<Preloader />);
      const skip = screen.getByRole('button', { name: 'Skip preloader' });
      act(() => {
        fireEvent.click(skip);
      });
      expect(exitStartSpy).toHaveBeenCalledTimes(1);
      expect(doneSpy).toHaveBeenCalledTimes(1);
      // Ordering: exit-start fires BEFORE done within the same finish() call.
      // The toHaveBeenCalledTimes(1) assertions above guarantee [0] is set.
      const exitOrder = exitStartSpy.mock.invocationCallOrder[0]!;
      const doneOrder = doneSpy.mock.invocationCallOrder[0]!;
      expect(exitOrder).toBeLessThan(doneOrder);
      // After finish(), the rest of the intro budget must not double-fire
      // either event (the scheduled timers are guarded by idempotency).
      act(() => {
        vi.advanceTimersByTime(DEFAULT_BUDGET_MS + 100);
      });
      expect(exitStartSpy).toHaveBeenCalledTimes(1);
      expect(doneSpy).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
      document.removeEventListener(PRELOADER_DONE_EVENT, doneSpy);
    }
  });

  it('Enter key on skip fires exit-start before done, each exactly once', () => {
    const exitStartSpy = vi.fn();
    const doneSpy = vi.fn();
    document.addEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
    document.addEventListener(PRELOADER_DONE_EVENT, doneSpy);
    try {
      render(<Preloader />);
      const skip = screen.getByRole('button', { name: 'Skip preloader' });
      act(() => {
        fireEvent.keyDown(skip, { key: 'Enter' });
      });
      expect(exitStartSpy).toHaveBeenCalledTimes(1);
      expect(doneSpy).toHaveBeenCalledTimes(1);
      expect(exitStartSpy.mock.invocationCallOrder[0]!).toBeLessThan(
        doneSpy.mock.invocationCallOrder[0]!,
      );
    } finally {
      document.removeEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
      document.removeEventListener(PRELOADER_DONE_EVENT, doneSpy);
    }
  });

  it('Space key on skip fires exit-start before done, each exactly once', () => {
    const exitStartSpy = vi.fn();
    const doneSpy = vi.fn();
    document.addEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
    document.addEventListener(PRELOADER_DONE_EVENT, doneSpy);
    try {
      render(<Preloader />);
      const skip = screen.getByRole('button', { name: 'Skip preloader' });
      act(() => {
        fireEvent.keyDown(skip, { key: ' ' });
      });
      expect(exitStartSpy).toHaveBeenCalledTimes(1);
      expect(doneSpy).toHaveBeenCalledTimes(1);
      expect(exitStartSpy.mock.invocationCallOrder[0]!).toBeLessThan(
        doneSpy.mock.invocationCallOrder[0]!,
      );
    } finally {
      document.removeEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
      document.removeEventListener(PRELOADER_DONE_EVENT, doneSpy);
    }
  });

  it('reduced-motion at mount fires both events exactly once and skips the overlay', () => {
    const restoreMedia = mockMatchMedia((q) => q.includes('reduce'));
    const exitStartSpy = vi.fn();
    const doneSpy = vi.fn();
    document.addEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
    document.addEventListener(PRELOADER_DONE_EVENT, doneSpy);
    try {
      const { container } = render(<Preloader />);
      // Overlay DOM must NOT exist when reduced-motion kicked in at mount.
      expect(container.querySelector('[role="progressbar"]')).toBeNull();
      // Both signals must have fired exactly once (and in the right order).
      expect(exitStartSpy).toHaveBeenCalledTimes(1);
      expect(doneSpy).toHaveBeenCalledTimes(1);
      expect(exitStartSpy.mock.invocationCallOrder[0]!).toBeLessThan(
        doneSpy.mock.invocationCallOrder[0]!,
      );
      // Final state: 'done' (exit-start marks 'exiting', done overrides).
      expect(document.documentElement.dataset.preloader).toBe('done');
    } finally {
      document.removeEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
      document.removeEventListener(PRELOADER_DONE_EVENT, doneSpy);
      restoreMedia();
    }
  });

  it('exit-start is idempotent: scheduled timer + skip tap coalesce to one dispatch', () => {
    const exitStartSpy = vi.fn();
    document.addEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
    try {
      render(<Preloader />);
      // Advance exactly to the scheduled exit-start — first (and only) emission.
      act(() => {
        vi.advanceTimersByTime(EXIT_START_MS_DEFAULT);
      });
      expect(exitStartSpy).toHaveBeenCalledTimes(1);
      // Now click skip — finish() re-invokes markPreloaderExitStart(), but
      // the 'exiting'/'done' guard suppresses a second dispatch.
      const skip = screen.getByRole('button', { name: 'Skip preloader' });
      act(() => {
        fireEvent.click(skip);
      });
      expect(exitStartSpy).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener(PRELOADER_EXIT_START_EVENT, exitStartSpy);
    }
  });

  it('data-preloader state machine: active → exiting → done', () => {
    // Pre-mount sanity: afterEach wiped the attribute; start from blank.
    expect(document.documentElement.dataset.preloader).toBeUndefined();
    render(<Preloader />);
    // Post-mount: the mount effect sets 'active'.
    expect(document.documentElement.dataset.preloader).toBe('active');
    // Halfway through the budget — still 'active'.
    act(() => {
      vi.advanceTimersByTime(EXIT_START_MS_DEFAULT - 1);
    });
    expect(document.documentElement.dataset.preloader).toBe('active');
    // At 2800ms — transitions to 'exiting'.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.documentElement.dataset.preloader).toBe('exiting');
    // At the full hide budget — transitions to 'done'.
    act(() => {
      vi.advanceTimersByTime(DEFAULT_BUDGET_MS - EXIT_START_MS_DEFAULT + 100);
    });
    expect(document.documentElement.dataset.preloader).toBe('done');
  });
});
