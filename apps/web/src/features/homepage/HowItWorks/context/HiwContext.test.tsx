import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, render, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { HiwProvider, useHiw } from './HiwContext';

afterEach(cleanup);

function wrap(
  initial?: { phase?: 0 | 1 | 2 | 3 | 4; outcome?: 'refund' | null },
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <HiwProvider initialPhase={initial?.phase} initialOutcome={initial?.outcome}>
      {children}
    </HiwProvider>
  );
  Wrapper.displayName = 'TestHiwProviderWrapper';
  return Wrapper;
}

describe('useHiw', () => {
  it('throws when consumed outside the provider', () => {
    // Avoid cluttering the test output with React error boundary logs
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useHiw())).toThrow(
      /useHiw must be used inside/,
    );
    err.mockRestore();
  });

  it('defaults phase=0 and outcome=null (happy path default)', () => {
    const { result } = renderHook(() => useHiw(), { wrapper: wrap() });
    expect(result.current.phase).toBe(0);
    expect(result.current.outcome).toBeNull();
  });

  it('respects initial values when provided', () => {
    const { result } = renderHook(() => useHiw(), {
      wrapper: wrap({ phase: 2, outcome: 'refund' }),
    });
    expect(result.current.phase).toBe(2);
    expect(result.current.outcome).toBe('refund');
  });

  it('setPhase transitions happy-path position', () => {
    const { result } = renderHook(() => useHiw(), { wrapper: wrap() });
    act(() => result.current.setPhase(3));
    expect(result.current.phase).toBe(3);
  });

  it('setOutcome toggles the Safeguards branch (null reverts to happy path)', () => {
    const { result } = renderHook(() => useHiw(), { wrapper: wrap() });
    act(() => result.current.setOutcome('disputeSeller'));
    expect(result.current.outcome).toBe('disputeSeller');
    act(() => result.current.setOutcome(null));
    expect(result.current.outcome).toBeNull();
  });
});

describe('reducedMotion mirroring', () => {
  const ORIGINAL_MATCH_MEDIA = window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.matchMedia = ORIGINAL_MATCH_MEDIA;
  });

  it('reports true when prefers-reduced-motion is set', async () => {
    const listeners = new Set<(e: MediaQueryListEvent) => void>();
    const mq = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) =>
        listeners.add(fn),
      removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) =>
        listeners.delete(fn),
      addListener: (fn: (e: MediaQueryListEvent) => void) => listeners.add(fn),
      removeListener: (fn: (e: MediaQueryListEvent) => void) =>
        listeners.delete(fn),
      onchange: null,
      dispatchEvent: () => true,
    } as unknown as MediaQueryList;

    window.matchMedia = vi.fn().mockReturnValue(mq);

    const { result } = renderHook(() => useHiw(), { wrapper: wrap() });
    // effect runs on mount; allow flush
    await act(async () => {});
    expect(result.current.reducedMotion).toBe(true);
  });

  it('stays false when matchMedia is unavailable (SSR-safe fallback)', () => {
    // @ts-expect-error — simulate missing matchMedia
    window.matchMedia = undefined;
    const { result } = renderHook(() => useHiw(), { wrapper: wrap() });
    expect(result.current.reducedMotion).toBe(false);
  });
});

describe('HiwProvider composition', () => {
  it('renders children without touching DOM', () => {
    const { container } = render(
      <HiwProvider>
        <span data-testid="child">hi</span>
      </HiwProvider>,
    );
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });
});
