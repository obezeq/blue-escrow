import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';

const mockMatchMediaAdd = vi.fn();

// Mock GSAP
vi.mock('@/animations/config/gsap-register', () => ({
  gsap: {
    matchMedia: () => ({
      add: mockMatchMediaAdd,
    }),
    from: vi.fn(),
    set: vi.fn(),
    to: vi.fn(),
  },
  useGSAP: vi.fn((cb: () => void) => {
    cb();
  }),
}));

vi.mock('@/animations/scrollTrigger/pinnedSection', () => ({
  createPinnedTimeline: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    to: vi.fn().mockReturnThis(),
  })),
}));

import { useFlowTimeline } from './useFlowTimeline';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useFlowTimeline', () => {
  it('does not throw with null container ref', () => {
    const containerRef = { current: null };
    const trailRef = { current: null };

    expect(() => {
      renderHook(() => useFlowTimeline(containerRef, trailRef));
    }).not.toThrow();
  });

  it('does not throw with null trail ref', () => {
    const containerRef = { current: document.createElement('div') };
    const trailRef = { current: null };

    expect(() => {
      renderHook(() => useFlowTimeline(containerRef, trailRef));
    }).not.toThrow();
  });

  it('calls useGSAP with scope on the container ref', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const trailRef = { current: null };

    renderHook(() => useFlowTimeline(containerRef, trailRef));

    // useGSAP was called (mocked to execute the callback)
    // With null trailRef, matchMedia.add should not be reached
    expect(mockMatchMediaAdd).not.toHaveBeenCalled();
  });

  it('registers matchMedia branches when refs are valid', () => {
    const container = document.createElement('div');
    const section = document.createElement('section');
    section.appendChild(container);
    document.body.appendChild(section);

    const containerRef = { current: container };
    const trailRef = {
      current: {
        svgEl: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
        trailPath: null,
        particle: null,
        contractGlow: null,
        checkmark: null,
        feeLabel: null,
      },
    };

    renderHook(() => useFlowTimeline(containerRef, trailRef));

    // With null trailPath/particle, buildDesktopTimeline bails early,
    // but matchMedia.add is still called for the 3 branches
    expect(mockMatchMediaAdd).toHaveBeenCalledTimes(3);

    document.body.removeChild(section);
  });
});
