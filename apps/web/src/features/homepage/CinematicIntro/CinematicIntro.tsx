'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  gsap,
  ScrollTrigger,
  useGSAP,
} from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { useScrollVideo, type VideoSegment } from './useScrollVideo';
import styles from './CinematicIntro.module.scss';

// Phase boundaries within the pinned scroll (0-1)
const PHASE_A_END = 0.4;
const PHASE_B_END = 0.8;
const PHASE_C_END = 0.9;
// Phase D: 0.9 - 1.0

const VIDEO_SEGMENTS: VideoSegment[] = [
  {
    mp4: '/video/handshake.mp4',
    webm: '/video/handshake.webm',
    start: 0,
    end: PHASE_A_END,
  },
  {
    mp4: '/video/explosion.mp4',
    webm: '/video/explosion.webm',
    start: PHASE_A_END,
    end: PHASE_B_END,
  },
];

export function CinematicIntro() {
  const sectionRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const segments = useMemo(() => VIDEO_SEGMENTS, []);
  const { draw } = useScrollVideo(canvasRef, segments);

  // Detect mobile
  useEffect(() => {
    const mql = window.matchMedia(MATCH_MEDIA.mobile);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Desktop: pinned scroll-driven timeline
  useGSAP(
    () => {
      if (!sectionRef.current || isMobile) return;

      const mm = gsap.matchMedia();

      mm.add(MATCH_MEDIA.noReducedMotion, () => {
        // Desktop: full scroll-driven video sequence
        mm.add(MATCH_MEDIA.desktop, () => {
          ScrollTrigger.create({
            trigger: sectionRef.current!,
            start: 'top top',
            end: '+=700%',
            pin: true,
            scrub: 0,
            onUpdate: (self) => {
              const p = self.progress;
              handleScrollUpdate(p);
            },
            onLeave: () => hideOverlays(),
            onEnterBack: () => showOverlays(),
          });
        });

        // Tablet: pinned but simplified
        mm.add(MATCH_MEDIA.tablet, () => {
          ScrollTrigger.create({
            trigger: sectionRef.current!,
            start: 'top top',
            end: '+=500%',
            pin: true,
            scrub: 0,
            onUpdate: (self) => {
              const p = self.progress;
              handleScrollUpdate(p);
            },
            onLeave: () => hideOverlays(),
            onEnterBack: () => showOverlays(),
          });
        });
      });

      // Reduced motion: no scroll-driven video, just show brand text
      mm.add(MATCH_MEDIA.reducedMotion, () => {
        if (overlayRef.current) overlayRef.current.style.display = 'none';
        if (brandRef.current) {
          brandRef.current.style.opacity = '1';
        }
      });
    },
    { dependencies: [isMobile, draw] },
  );

  // Mobile: simple fade animation (no pin, no scroll video)
  useGSAP(
    () => {
      if (!isMobile || !sectionRef.current) return;

      const mm = gsap.matchMedia();
      mm.add(MATCH_MEDIA.noReducedMotion, () => {
        // Show poster, then fade to brand text
        if (overlayRef.current) overlayRef.current.style.display = 'none';

        if (posterRef.current) {
          gsap.fromTo(
            posterRef.current,
            { opacity: 1 },
            {
              opacity: 0,
              duration: 1.5,
              delay: 0.5,
              ease: 'power2.inOut',
            },
          );
        }

        if (brandRef.current) {
          gsap.fromTo(
            brandRef.current,
            { opacity: 0 },
            {
              opacity: 1,
              duration: 1,
              delay: 1.2,
              ease: 'power2.out',
            },
          );
        }

        // Hide fixed overlays when section scrolls out of view
        ScrollTrigger.create({
          trigger: sectionRef.current!,
          start: 'bottom 20%',
          onEnter: () => {
            if (brandRef.current) brandRef.current.style.opacity = '0';
          },
          onLeaveBack: () => {
            if (brandRef.current) brandRef.current.style.opacity = '1';
          },
        });
      });

      mm.add(MATCH_MEDIA.reducedMotion, () => {
        if (overlayRef.current) overlayRef.current.style.display = 'none';
        if (posterRef.current) posterRef.current.style.display = 'none';
        if (brandRef.current) brandRef.current.style.opacity = '1';

        // Hide brand text when section leaves viewport
        ScrollTrigger.create({
          trigger: sectionRef.current!,
          start: 'bottom 20%',
          onEnter: () => {
            if (brandRef.current) brandRef.current.style.opacity = '0';
          },
          onLeaveBack: () => {
            if (brandRef.current) brandRef.current.style.opacity = '1';
          },
        });
      });
    },
    { dependencies: [isMobile] },
  );

  function handleScrollUpdate(progress: number) {
    // Draw video frame (phases A & B), keep last frame during crossfade (C)
    if (progress <= PHASE_C_END) {
      draw(Math.min(progress, PHASE_B_END));
    }

    // Canvas opacity: fades during Phase C crossfade (0.8 → 0.9)
    if (canvasRef.current) {
      if (progress < PHASE_B_END) {
        canvasRef.current.style.opacity = '1';
      } else if (progress < PHASE_C_END) {
        const fadeProgress =
          (progress - PHASE_B_END) / (PHASE_C_END - PHASE_B_END);
        canvasRef.current.style.opacity = String(1 - fadeProgress);
      } else {
        canvasRef.current.style.opacity = '0';
      }
    }

    // Overlay (blue bg): stays visible throughout — provides blue backdrop
    // for both video canvas and brand text reveal
    if (overlayRef.current) {
      overlayRef.current.style.opacity = '1';
    }

    // Brand text: Phase D reveal (0.9 → 1.0)
    if (brandRef.current) {
      if (progress < PHASE_C_END) {
        brandRef.current.style.opacity = '0';
      } else {
        const revealProgress =
          (progress - PHASE_C_END) / (1 - PHASE_C_END);
        brandRef.current.style.opacity = String(
          Math.min(1, revealProgress * 1.5),
        );
      }
    }
  }

  function hideOverlays() {
    if (overlayRef.current) overlayRef.current.style.opacity = '0';
    if (canvasRef.current) canvasRef.current.style.opacity = '0';
    if (brandRef.current) brandRef.current.style.opacity = '0';
  }

  function showOverlays() {
    // Reset to beginning state on scroll back
    if (overlayRef.current) overlayRef.current.style.opacity = '1';
    if (canvasRef.current) canvasRef.current.style.opacity = '1';
    if (brandRef.current) brandRef.current.style.opacity = '0';
  }

  return (
    <>
      <section
        className={`o-section ${styles.intro}`}
        ref={sectionRef}
        aria-label="Introduction"
      >
        {/* Mobile: poster image fallback */}
        {isMobile && (
          <img
            ref={posterRef}
            className={styles.intro__poster}
            src="/video/handshake-poster.webp"
            alt=""
            aria-hidden="true"
          />
        )}
      </section>

      {/* Video overlay — position:fixed, above Three.js (z-5), below header (z-100) */}
      <div
        className={styles.intro__videoOverlay}
        ref={overlayRef}
        aria-hidden="true"
      >
        <canvas ref={canvasRef} className={styles.intro__canvas} />
      </div>

      {/* Brand text — position:fixed, above Three.js (z-5) */}
      <div className={styles.intro__brand} ref={brandRef}>
        <h2 className={styles.intro__brandText}>BLUE ESCROW</h2>
      </div>
    </>
  );
}
