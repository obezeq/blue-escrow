import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type * as ReactModule from 'react';

const { gsapFrom, gsapTo, gsapSet, mmAdd, tweenTimeScale } = vi.hoisted(() => ({
  gsapFrom: vi.fn(),
  gsapTo: vi.fn(),
  gsapSet: vi.fn(),
  mmAdd: vi.fn(),
  tweenTimeScale: vi.fn(),
}));

vi.mock('@/animations/config/gsap-register', async () => {
  const React = await vi.importActual<typeof ReactModule>('react');
  return {
    gsap: {
      matchMedia: () => ({ add: mmAdd }),
      from: gsapFrom,
      // `to` returns a mock Tween so hover handlers can call `timeScale`.
      to: vi.fn(() => ({
        timeScale: tweenTimeScale,
      })),
      set: gsapSet,
      fromTo: vi.fn(),
      timeline: vi.fn(() => ({
        to: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
      })),
    },
    useGSAP: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanupFn = cb();
        return typeof cleanupFn === 'function' ? cleanupFn : undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});

import { TrustLayerAnimations } from './TrustLayerAnimations';

afterEach(() => {
  cleanup();
  gsapFrom.mockClear();
  gsapTo.mockClear();
  gsapSet.mockClear();
  mmAdd.mockClear();
  tweenTimeScale.mockClear();
});

describe('TrustLayerAnimations', () => {
  it('renders children content', () => {
    render(
      <TrustLayerAnimations>
        <h2>Test Heading</h2>
        <p>Test paragraph</p>
      </TrustLayerAnimations>,
    );
    expect(screen.getByText('Test Heading')).toBeDefined();
    expect(screen.getByText('Test paragraph')).toBeDefined();
  });

  it('wraps children in a div container', () => {
    const { container } = render(
      <TrustLayerAnimations>
        <span>Child</span>
      </TrustLayerAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('preserves child elements for SSR accessibility', () => {
    render(
      <TrustLayerAnimations>
        <pre>
          <code>function resolve</code>
        </pre>
      </TrustLayerAnimations>,
    );
    expect(screen.getByText('function resolve')).toBeDefined();
  });

  it('hover on the marquee wrapper slows the tween and mouseleave restores it', () => {
    render(
      <TrustLayerAnimations>
        <div data-testid="marquee-wrap">
          <div data-animate="marquee-track">marquee inside</div>
        </div>
      </TrustLayerAnimations>,
    );

    // Drive the captured no-reduced-motion callback manually so the
    // marquee tween + listeners are created.
    const noRmEntry = mmAdd.mock.calls.find(
      ([q]) => q === '(prefers-reduced-motion: no-preference)',
    );
    expect(noRmEntry).toBeDefined();
    (noRmEntry![1] as () => void)();

    const wrap = screen.getByTestId('marquee-wrap');
    fireEvent.mouseEnter(wrap);
    expect(tweenTimeScale).toHaveBeenLastCalledWith(0.2);

    fireEvent.mouseLeave(wrap);
    expect(tweenTimeScale).toHaveBeenLastCalledWith(1);
  });
});
