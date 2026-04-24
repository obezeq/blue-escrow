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
  useMemo,
  useState,
  useSyncExternalStore,
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

// --- prefers-reduced-motion external store ---------------------------------
//
// useSyncExternalStore is the React-recommended path for subscribing to
// browser-native stores (matchMedia / online status / etc.). It sidesteps
// the `react-hooks/set-state-in-effect` foot-gun that a useEffect-based
// subscription hits — the store itself drives updates, so React can never
// schedule a cascading render from synchronous setState in the effect body.
// Both the subscribe function and the snapshot getter are stable module
// references so memoized subscribers never re-register.

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
  }
  // Older Safari lacks addEventListener on MediaQueryList
  mq.addListener(callback);
  return () => mq.removeListener(callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

export function HiwProvider({
  children,
  initialPhase = 0,
  initialOutcome = null,
}: HiwProviderProps) {
  const [phase, setPhaseState] = useState<PhaseIndex>(initialPhase);
  const [outcome, setOutcomeState] = useState<OutcomeId | null>(initialOutcome);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

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
