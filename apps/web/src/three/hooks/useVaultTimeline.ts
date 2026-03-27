// ---------------------------------------------------------------------------
// Maps scroll progress → vault state + sub-progress
// Calls ThreeProvider setters only on state transitions (~10 total)
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useThreeContext, type VaultState, type SectionBg } from '@/providers/ThreeProvider';
import { SCROLL_THRESHOLDS, type ScrollSection } from '../config/vaultConfig';
import { useSmoothedScroll } from './useScrollProgress';

export interface VaultTimelineState {
  state: VaultState;
  subProgress: number;
  bg: SectionBg;
  bloomEnabled: boolean;
}

/**
 * Resolves which scroll section the current progress falls in.
 * Starts from lastIndex for O(1) adjacent lookups.
 */
function resolveSection(
  progress: number,
  lastIndex: number,
): { section: ScrollSection; index: number; subProgress: number } {
  // Check adjacent sections first (common case during scroll)
  for (const offset of [0, 1, -1]) {
    const idx = lastIndex + offset;
    if (idx >= 0 && idx < SCROLL_THRESHOLDS.length) {
      const s = SCROLL_THRESHOLDS[idx]!;
      if (progress >= s.start && progress < s.end) {
        const sub = (progress - s.start) / (s.end - s.start);
        return { section: s, index: idx, subProgress: sub };
      }
    }
  }

  // Fallback: linear scan
  for (let i = 0; i < SCROLL_THRESHOLDS.length; i++) {
    const s = SCROLL_THRESHOLDS[i]!;
    if (progress >= s.start && progress < s.end) {
      const sub = (progress - s.start) / (s.end - s.start);
      return { section: s, index: i, subProgress: sub };
    }
  }

  // At 1.0 (end), use last section
  const last = SCROLL_THRESHOLDS[SCROLL_THRESHOLDS.length - 1]!;
  return {
    section: last,
    index: SCROLL_THRESHOLDS.length - 1,
    subProgress: 1,
  };
}

export function useVaultTimeline() {
  const smoothedRef = useSmoothedScroll();
  const { setVaultState, setCurrentSectionBg } = useThreeContext();

  // Refs for per-frame reads (no React re-renders)
  const stateRef = useRef<VaultState>('forming');
  const subProgressRef = useRef(0);
  const bgRef = useRef<SectionBg>('blue');
  const bloomRef = useRef(true);
  const lastIndexRef = useRef(0);

  // Bridge setters to refs so they're stable
  const setVaultStateRef = useRef(setVaultState);
  const setBgRef = useRef(setCurrentSectionBg);
  useEffect(() => {
    setVaultStateRef.current = setVaultState;
    setBgRef.current = setCurrentSectionBg;
  }, [setVaultState, setCurrentSectionBg]);

  useFrame(() => {
    const progress = smoothedRef.current;
    const { section, index, subProgress } = resolveSection(progress, lastIndexRef.current);

    lastIndexRef.current = index;
    subProgressRef.current = subProgress;
    bloomRef.current = section.bloomEnabled;

    // Only call React setters on state transitions
    if (section.state !== stateRef.current) {
      stateRef.current = section.state;
      setVaultStateRef.current(section.state);
    }
    if (section.bg !== bgRef.current) {
      bgRef.current = section.bg;
      setBgRef.current(section.bg);
    }
  });

  return {
    stateRef,
    subProgressRef,
    bgRef,
    bloomRef,
    scrollRef: smoothedRef,
  };
}
