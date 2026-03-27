import { useCallback, useEffect, useRef } from 'react';

export interface VideoSegment {
  mp4: string;
  webm: string;
  start: number; // 0-1 progress where this segment begins
  end: number; // 0-1 progress where this segment ends
}

interface ScrollVideoState {
  /** Draw the frame corresponding to the given progress (0-1). */
  draw: (progress: number) => void;
  /** True when all videos have enough data to seek. */
  ready: boolean;
}

/**
 * Manages scroll-driven video playback on a canvas.
 * Creates hidden <video> elements, seeks to the correct frame
 * based on scroll progress, and draws to a shared canvas.
 */
export function useScrollVideo(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  segments: VideoSegment[],
): ScrollVideoState {
  const videosRef = useRef<HTMLVideoElement[]>([]);
  const readyRef = useRef(false);
  const readyCount = useRef(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastSegmentIndex = useRef(-1);

  // Create video elements once
  useEffect(() => {
    const videos: HTMLVideoElement[] = [];

    segments.forEach((seg) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      // Prefer WebM, fall back to MP4
      const supportsWebm = video.canPlayType('video/webm; codecs="vp9"');
      video.src = supportsWebm ? seg.webm : seg.mp4;

      video.addEventListener(
        'canplaythrough',
        () => {
          readyCount.current += 1;
          if (readyCount.current >= segments.length) {
            readyRef.current = true;
          }
        },
        { once: true },
      );

      video.load();
      videos.push(video);
    });

    videosRef.current = videos;

    return () => {
      videos.forEach((v) => {
        v.pause();
        v.src = '';
        v.load();
      });
      videosRef.current = [];
    };
  }, [segments]);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext('2d', { alpha: false });
  }, [canvasRef]);

  const draw = useCallback(
    (progress: number) => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas || videosRef.current.length === 0) return;

      // Find active segment
      let activeIndex = -1;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]!;
        if (progress >= seg.start && progress < seg.end) {
          activeIndex = i;
          break;
        }
      }

      // If past all segments, draw last frame of last segment
      if (activeIndex === -1 && progress >= segments[segments.length - 1]!.end) {
        activeIndex = segments.length - 1;
      }

      if (activeIndex === -1) return;

      const seg = segments[activeIndex]!;
      const video = videosRef.current[activeIndex];
      if (!video || video.readyState < 2) return;

      // Map progress within segment to video currentTime
      const localProgress = Math.min(
        1,
        Math.max(0, (progress - seg.start) / (seg.end - seg.start)),
      );
      const targetTime = localProgress * video.duration;

      // Only seek if time changed meaningfully (avoid redundant seeks)
      if (Math.abs(video.currentTime - targetTime) > 0.02) {
        video.currentTime = targetTime;
      }

      // Size canvas to viewport if needed
      const dpr = Math.min(window.devicePixelRatio, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      // Draw video frame with cover behavior
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw === 0 || vh === 0) return;

      const canvasAspect = (w * dpr) / (h * dpr);
      const videoAspect = vw / vh;

      let sx = 0;
      let sy = 0;
      let sw = vw;
      let sh = vh;

      if (videoAspect > canvasAspect) {
        // Video wider — crop sides
        sw = vh * canvasAspect;
        sx = (vw - sw) / 2;
      } else {
        // Video taller — crop top/bottom
        sh = vw / canvasAspect;
        sy = (vh - sh) / 2;
      }

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w * dpr, h * dpr);
      lastSegmentIndex.current = activeIndex;
    },
    [canvasRef, segments],
  );

  return {
    draw,
    get ready() {
      return readyRef.current;
    },
  };
}
