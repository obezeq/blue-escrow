import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type * as ReactModule from 'react';
import { mockMatchMedia } from '@/test/setup';

// ---------------------------------------------------------------------------
// Hoisted capture buckets — vi.mock runs before imports, and we need shared
// refs so tests can inspect calls made during the useGSAP effect.
// ---------------------------------------------------------------------------

const {
  gsapToCalls,
  gsapQuickToCalls,
  gsapSetCalls,
} = vi.hoisted(() => ({
  gsapToCalls: [] as Array<[unknown, Record<string, unknown>]>,
  gsapQuickToCalls: [] as Array<[unknown, string, Record<string, unknown>]>,
  gsapSetCalls: [] as Array<[unknown, Record<string, unknown>]>,
}));

vi.mock('@/animations/config/gsap-register', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  const makeTween = () => {
    const tween = {
      pause: vi.fn(() => tween),
      restart: vi.fn(() => tween),
      kill: vi.fn(),
    };
    return tween;
  };

  return {
    gsap: {
      to: vi.fn((target: unknown, vars: Record<string, unknown>) => {
        gsapToCalls.push([target, vars]);
        return makeTween();
      }),
      set: vi.fn((target: unknown, vars: Record<string, unknown>) => {
        gsapSetCalls.push([target, vars]);
      }),
      quickTo: vi.fn((target: unknown, prop: string, vars: Record<string, unknown>) => {
        gsapQuickToCalls.push([target, prop, vars]);
        return vi.fn();
      }),
    },
    // Minimal useGSAP shim: run the callback inside a real useEffect so refs
    // are populated. Return value is treated as the cleanup fn.
    useGSAP: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});

import { CustomCursor } from './CustomCursor';

afterEach(() => {
  cleanup();
  gsapToCalls.length = 0;
  gsapQuickToCalls.length = 0;
  gsapSetCalls.length = 0;
  document.documentElement.style.cursor = '';
});

// Active cursor path needs `pointer: fine` + no reduced-motion. We override
// per-test since the default setup stub returns `matches: false` for every
// query — which would make the early gate bail out and skip all hover logic.
function enableCursorQueries() {
  return mockMatchMedia(
    (q) => q.includes('pointer: fine') && !q.includes('prefers-reduced-motion'),
  );
}

describe('CustomCursor', () => {
  it('mounts without crashing', () => {
    expect(() => {
      render(<CustomCursor />);
    }).not.toThrow();
  });

  it('renders with aria-hidden', () => {
    const { container } = render(<CustomCursor />);
    expect((container.firstChild as HTMLElement).getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('skips pointer listeners on coarse or reduced-motion devices', () => {
    // Default setup.ts matchMedia returns matches:false for every query, so
    // the gate bails and neither quickTo nor hover tweens are created.
    render(<CustomCursor />);
    expect(gsapQuickToCalls.length).toBe(0);
  });

  it('pre-creates paused scale tweens — never width/height — on active mount', () => {
    const restore = enableCursorQueries();
    try {
      render(<CustomCursor />);

      // quickTo is invoked for x/y only — no width/height shortcut setters.
      const quickProps = gsapQuickToCalls.map(([, prop]) => prop);
      expect(quickProps).toContain('x');
      expect(quickProps).toContain('y');
      expect(quickProps).not.toContain('width');
      expect(quickProps).not.toContain('height');

      // Pre-created hover tweens must only touch transform/opacity vars.
      const forbidden = ['width', 'height', 'border', 'backgroundColor', 'background'];
      for (const [, vars] of gsapToCalls) {
        for (const key of forbidden) {
          expect(vars).not.toHaveProperty(key);
        }
      }

      // And at least one tween animates scale (the hover-in).
      const animatedProps = gsapToCalls.flatMap(([, vars]) => Object.keys(vars));
      expect(animatedProps).toContain('scale');
    } finally {
      restore();
    }
  });

  it('does NOT write inline width/height to the dot when hovering an interactive target', () => {
    const restore = enableCursorQueries();
    try {
      const button = document.createElement('button');
      document.body.appendChild(button);

      const { container } = render(<CustomCursor />);
      const dot = container.querySelector<HTMLDivElement>('[class*="cursor__dot"]');
      expect(dot).not.toBeNull();

      // Fire a pointermove first to flip the internal `confirmed` guard on,
      // then pointerover the button. The production path must never write
      // inline `width:` / `height:` onto the dot — that's the layout-thrash
      // regression we rewrote away.
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 100,
          clientY: 100,
          pointerType: 'mouse',
        }),
      );
      button.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true }),
      );

      const inlineStyle = dot!.getAttribute('style') ?? '';
      expect(inlineStyle).not.toMatch(/width\s*:/);
      expect(inlineStyle).not.toMatch(/height\s*:/);

      document.body.removeChild(button);
    } finally {
      restore();
    }
  });

  it('unmounts cleanly and restores document cursor', () => {
    const restore = enableCursorQueries();
    try {
      const { unmount } = render(<CustomCursor />);
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 50,
          clientY: 50,
          pointerType: 'mouse',
        }),
      );
      expect(() => unmount()).not.toThrow();
      expect(document.documentElement.style.cursor).toBe('');
    } finally {
      restore();
    }
  });
});
