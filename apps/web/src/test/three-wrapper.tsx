// ---------------------------------------------------------------------------
// Test wrapper for components that render inside an R3F <Canvas>
// Mocks provider hooks so components can mount in isolation
// ---------------------------------------------------------------------------

import { vi } from 'vitest';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';

// Mock LenisProvider — must be called before importing components
export function mockProviders() {
  vi.mock('@/providers/LenisProvider', () => ({
    useScrollProgress: () => ({ current: 0 }),
  }));

  vi.mock('@/providers/ThreeProvider', () => ({
    useThreeContext: () => ({
      vaultState: 'forming',
      setVaultState: vi.fn(),
      currentSectionBg: 'blue',
      setCurrentSectionBg: vi.fn(),
      isThreeReady: false,
      setIsThreeReady: vi.fn(),
      ctaHovered: false,
      setCtaHovered: vi.fn(),
    }),
  }));

  vi.mock('@react-three/postprocessing', () => ({
    EffectComposer: ({ children }: { children: ReactNode }) => children,
    Bloom: () => null,
  }));
}

/**
 * Wraps an R3F component inside a Canvas for testing.
 * Use for components that live inside the Three.js scene graph.
 */
export function ThreeTestCanvas({ children }: { children: ReactNode }) {
  return (
    <Canvas frameloop="never">
      {children}
    </Canvas>
  );
}
