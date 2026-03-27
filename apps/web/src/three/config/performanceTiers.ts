// ---------------------------------------------------------------------------
// Performance tier detection + hook
// Static detection at mount, runtime auto-downgrade via PerformanceMonitor
// ---------------------------------------------------------------------------

'use client';

import { useCallback, useRef } from 'react';
import { PARTICLE_COUNT } from './vaultConfig';

export type PerformanceTier = 'high' | 'medium' | 'low';

export interface TierConfig {
  particleCount: number;
  dpr: number | [number, number];
  bloomEnabled: boolean;
  antialias: boolean;
}

export const TIER_CONFIGS: Record<PerformanceTier, TierConfig> = {
  high: {
    particleCount: PARTICLE_COUNT.desktop,
    dpr: [1, 2],
    bloomEnabled: true,
    antialias: true,
  },
  medium: {
    particleCount: PARTICLE_COUNT.tablet,
    dpr: [1, 1.5],
    bloomEnabled: false,
    antialias: true,
  },
  low: {
    particleCount: PARTICLE_COUNT.mobile,
    dpr: 1,
    bloomEnabled: false,
    antialias: false,
  },
};

const TIER_ORDER: PerformanceTier[] = ['high', 'medium', 'low'];

export function detectPerformanceTier(): PerformanceTier {
  if (typeof window === 'undefined') return 'low';

  // prefers-reduced-motion → LOW tier (static vault, minimal GPU work)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'low';
  }

  let score = 0;

  // Hardware concurrency
  const cores = navigator.hardwareConcurrency ?? 2;
  if (cores >= 8) score += 3;
  else if (cores >= 4) score += 2;

  // Device pixel ratio (high DPR signals capable device)
  const dpr = window.devicePixelRatio ?? 1;
  if (dpr >= 2) score += 1;

  // Screen width as device class proxy
  const width = window.screen.width;
  if (width >= 1440) score += 2;
  else if (width >= 1024) score += 1;

  // Touch-primary = likely mobile/tablet
  if (window.matchMedia('(pointer: coarse)').matches) {
    score -= 2;
  }

  // GPU detection (best-effort)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
        if (/Intel|Mali|Adreno\s[0-5]/i.test(renderer)) score -= 1;
        if (/NVIDIA|Radeon\sRX|RTX|GTX/i.test(renderer)) score += 2;
      }
    }
    canvas.remove();
  } catch {
    // WebGL info is best-effort
  }

  if (score >= 5) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function downgradeTier(current: PerformanceTier): PerformanceTier {
  const idx = TIER_ORDER.indexOf(current);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : current;
}

export function usePerformanceTier() {
  const tierRef = useRef<PerformanceTier | null>(null);
  const configRef = useRef<TierConfig | null>(null);

  // Lazy init — runs once on first access
  if (tierRef.current === null) {
    const tier = detectPerformanceTier();
    tierRef.current = tier;
    configRef.current = TIER_CONFIGS[tier];
  }

  const onDowngrade = useCallback(() => {
    if (!tierRef.current) return;
    const next = downgradeTier(tierRef.current);
    if (next !== tierRef.current) {
      tierRef.current = next;
      configRef.current = TIER_CONFIGS[next];
    }
  }, []);

  return {
    tier: tierRef.current!,
    config: configRef.current!,
    onDowngrade,
  };
}
