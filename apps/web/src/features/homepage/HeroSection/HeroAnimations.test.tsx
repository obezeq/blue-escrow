import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import {
  PRELOADER_DONE_EVENT,
  PRELOADER_SESSION_KEY,
} from '@/lib/preloader/completion';

const { gsapSet, gsapTo, gsapFrom, mmAdd } = vi.hoisted(() => ({
  gsapSet: vi.fn(),
  gsapTo: vi.fn(),
  gsapFrom: vi.fn(),
  mmAdd: vi.fn(),
}));

vi.mock('@/animations/config/gsap-register', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    gsap: {
      matchMedia: () => ({ add: mmAdd }),
      from: gsapFrom,
      to: gsapTo,
      set: gsapSet,
    },
    // Run the callback inside a real useEffect so refs are populated.
    useGSAP: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});

import { HeroAnimations } from './HeroAnimations';

afterEach(() => {
  cleanup();
  gsapSet.mockClear();
  gsapTo.mockClear();
  gsapFrom.mockClear();
  mmAdd.mockClear();
  delete document.documentElement.dataset.preloader;
  try {
    sessionStorage.removeItem(PRELOADER_SESSION_KEY);
  } catch {
    /* noop */
  }
});

describe('HeroAnimations', () => {
  it('renders children', () => {
    render(
      <HeroAnimations>
        <h1>Test Heading</h1>
      </HeroAnimations>,
    );
    expect(screen.getByText('Test Heading')).toBeDefined();
  });

  it('wraps children in a div', () => {
    const { container } = render(
      <HeroAnimations>
        <span>Child</span>
      </HeroAnimations>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('does not invoke gsap.matchMedia until preloader:done fires', () => {
    render(
      <HeroAnimations>
        <h1>Hero</h1>
      </HeroAnimations>,
    );
    expect(mmAdd).not.toHaveBeenCalled();
    act(() => {
      document.dispatchEvent(new CustomEvent(PRELOADER_DONE_EVENT));
    });
    expect(mmAdd).toHaveBeenCalled();
  });

  it('starts immediately if preloader is already done at mount (data attribute)', () => {
    document.documentElement.dataset.preloader = 'done';
    render(
      <HeroAnimations>
        <h1>Hero</h1>
      </HeroAnimations>,
    );
    expect(mmAdd).toHaveBeenCalled();
  });

  it('starts immediately if the session storage flag is set at mount', () => {
    sessionStorage.setItem(PRELOADER_SESSION_KEY, '1');
    render(
      <HeroAnimations>
        <h1>Hero</h1>
      </HeroAnimations>,
    );
    expect(mmAdd).toHaveBeenCalled();
  });
});
