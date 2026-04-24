'use client';

/**
 * HiwContext — single source of truth for the How It Works section state.
 *
 * Owns:
 *   - `phase`         · happy-path pinned-timeline position (0..4).
 *   - `outcome`       · which Safeguards branch is active, or `null` for
 *                       the default happy path (Delivery resolution).
 *   - `reducedMotion` · mirrors prefers-reduced-motion so any component
 *                       can gate animations without re-evaluating media
 *                       queries (and so unit tests can force a path).
 *
 * Data-attribute contract published to downstream lanes:
 *   - `data-hiw-phase="0..4"`           — happy-path phase
 *   - `data-hiw-outcome="<OutcomeId>|happy"` — active branch
 *   - `data-hiw-reduced-motion="true|false"` — for CSS selector hooks
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PhaseIndex } from '../data/types';
import type { OutcomeId } from '../data/outcomes';

export interface HiwContextValue {
  phase: PhaseIndex;
  setPhase: (phase: PhaseIndex) => void;
  outcome: OutcomeId | null;
  setOutcome: (outcome: OutcomeId | null) => void;
  reducedMotion: boolean;
}

const HiwContext = createContext<HiwContextValue | null>(null);

export interface HiwProviderProps {
  children: ReactNode;
  initialPhase?: PhaseIndex;
  initialOutcome?: OutcomeId | null;
}

export function HiwProvider({
  children,
  initialPhase = 0,
  initialOutcome = null,
}: HiwProviderProps) {
  const [phase, setPhaseState] = useState<PhaseIndex>(initialPhase);
  const [outcome, setOutcomeState] = useState<OutcomeId | null>(initialOutcome);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    // Older Safari lacks addEventListener on MediaQueryList
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  const setPhase = useCallback((next: PhaseIndex) => setPhaseState(next), []);
  const setOutcome = useCallback(
    (next: OutcomeId | null) => setOutcomeState(next),
    [],
  );

  const value = useMemo<HiwContextValue>(
    () => ({ phase, setPhase, outcome, setOutcome, reducedMotion }),
    [phase, setPhase, outcome, setOutcome, reducedMotion],
  );

  return <HiwContext.Provider value={value}>{children}</HiwContext.Provider>;
}

export function useHiw(): HiwContextValue {
  const value = useContext(HiwContext);
  if (!value) {
    throw new Error('useHiw must be used inside <HiwProvider>');
  }
  return value;
}
