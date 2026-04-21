'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Vault state types — string union for tree-shaking
// ---------------------------------------------------------------------------

export type VaultState =
  | 'forming'
  | 'complete'
  | 'shattering'
  | 'scattered'
  | 'rebuilding_buyer'
  | 'rebuilding_seller'
  | 'rebuilding_middleman'
  | 'rebuilt'
  | 'morphing'
  | 'peaceful';

export type SectionBg = 'blue' | 'white';

interface ThreeContextValue {
  vaultState: VaultState;
  setVaultState: (state: VaultState) => void;
  currentSectionBg: SectionBg;
  setCurrentSectionBg: (bg: SectionBg) => void;
  isThreeReady: boolean;
  setIsThreeReady: (ready: boolean) => void;
  ctaHovered: boolean;
  setCtaHovered: (hovered: boolean) => void;
}

const ThreeContext = createContext<ThreeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useThreeContext(): ThreeContextValue {
  const ctx = useContext(ThreeContext);
  if (!ctx) {
    throw new Error('useThreeContext must be used within a ThreeProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider — state changes infrequently (section transitions, not per-frame)
// ---------------------------------------------------------------------------

export function ThreeProvider({ children }: { children: ReactNode }) {
  const [vaultState, setVaultState] = useState<VaultState>('forming');
  const [currentSectionBg, setCurrentSectionBg] = useState<SectionBg>('blue');
  const [isThreeReady, setIsThreeReady] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

  const stableSetVaultState = useCallback(
    (state: VaultState) => setVaultState(state),
    [],
  );
  const stableSetCurrentSectionBg = useCallback(
    (bg: SectionBg) => setCurrentSectionBg(bg),
    [],
  );
  const stableSetIsThreeReady = useCallback(
    (ready: boolean) => setIsThreeReady(ready),
    [],
  );
  const stableSetCtaHovered = useCallback(
    (hovered: boolean) => setCtaHovered(hovered),
    [],
  );

  const value = useMemo<ThreeContextValue>(
    () => ({
      vaultState,
      setVaultState: stableSetVaultState,
      currentSectionBg,
      setCurrentSectionBg: stableSetCurrentSectionBg,
      isThreeReady,
      setIsThreeReady: stableSetIsThreeReady,
      ctaHovered,
      setCtaHovered: stableSetCtaHovered,
    }),
    [
      vaultState,
      stableSetVaultState,
      currentSectionBg,
      stableSetCurrentSectionBg,
      isThreeReady,
      stableSetIsThreeReady,
      ctaHovered,
      stableSetCtaHovered,
    ],
  );

  return (
    <ThreeContext.Provider value={value}>{children}</ThreeContext.Provider>
  );
}
