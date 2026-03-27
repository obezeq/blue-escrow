import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollVideo, type VideoSegment } from './useScrollVideo';

// Mock matchMedia and HTMLVideoElement
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

const SEGMENTS: VideoSegment[] = [
  { mp4: '/video/a.mp4', webm: '/video/a.webm', start: 0, end: 0.4 },
  { mp4: '/video/b.mp4', webm: '/video/b.webm', start: 0.4, end: 0.7 },
];

describe('useScrollVideo', () => {
  it('returns draw function and ready state', () => {
    const canvasRef = { current: document.createElement('canvas') };
    const { result } = renderHook(() => useScrollVideo(canvasRef, SEGMENTS));

    expect(typeof result.current.draw).toBe('function');
    expect(typeof result.current.ready).toBe('boolean');
  });

  it('starts with ready = false', () => {
    const canvasRef = { current: document.createElement('canvas') };
    const { result } = renderHook(() => useScrollVideo(canvasRef, SEGMENTS));

    expect(result.current.ready).toBe(false);
  });

  it('draw does not throw when called before videos load', () => {
    const canvasRef = { current: document.createElement('canvas') };
    const { result } = renderHook(() => useScrollVideo(canvasRef, SEGMENTS));

    expect(() => result.current.draw(0.2)).not.toThrow();
  });

  it('draw does not throw with null canvas ref', () => {
    const canvasRef = { current: null };
    const { result } = renderHook(() => useScrollVideo(canvasRef, SEGMENTS));

    expect(() => result.current.draw(0.5)).not.toThrow();
  });
});
