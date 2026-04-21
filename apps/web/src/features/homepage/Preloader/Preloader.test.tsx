import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';

const lenisStop = vi.fn();
const lenisStart = vi.fn();

vi.mock('lenis/react', () => ({
  useLenis: () => ({
    stop: lenisStop,
    start: lenisStart,
  }),
}));

import { Preloader } from './Preloader';

afterEach(() => {
  cleanup();
  lenisStop.mockClear();
  lenisStart.mockClear();
  vi.useRealTimers();
});

describe('Preloader (v6 intro)', () => {
  beforeEach(() => {
    // Default jsdom matchMedia from setup.ts returns matches=false for everything.
    vi.useFakeTimers();
  });

  it('renders the Blue Escrow wordmark split into letters', () => {
    render(<Preloader />);
    expect(document.getElementById('intro')).not.toBeNull();
    const letters = document.querySelectorAll(
      '#intro [class*="letter"]',
    );
    // "Blue" (4) + "Escrow" (6) = 10 letters
    expect(letters.length).toBe(10);
  });

  it('renders the initializing bar with label, track and 000% counter', () => {
    const { container } = render(<Preloader />);
    expect(container.textContent).toContain('Initializing protocol');
    expect(container.textContent).toContain('000%');
    expect(container.querySelector('[class*="track"] i')).not.toBeNull();
  });

  it('locks Lenis scroll while visible', () => {
    render(<Preloader />);
    expect(lenisStop).toHaveBeenCalled();
  });

  it('unmounts itself after the intro duration and releases Lenis', () => {
    render(<Preloader />);
    expect(document.getElementById('intro')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(document.getElementById('intro')).toBeNull();
    expect(lenisStart).toHaveBeenCalled();
  });
});
