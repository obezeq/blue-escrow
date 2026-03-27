'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { useThreeContext } from '@/providers/ThreeProvider';
import { useLenis as useLenisInstance } from 'lenis/react';
import styles from './Preloader.module.scss';

const VIDEO_SOURCES = ['/video/handshake.mp4', '/video/explosion.mp4'];
const THREE_WEIGHT = 0.6;
const VIDEO_WEIGHT = 0.4;
const TIMEOUT_MS = 3_000;
const LERP_SPEED = 0.08;

export function Preloader() {
  const { isThreeReady } = useThreeContext();
  const lenis = useLenisInstance();
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const videosLoaded = useRef(0);
  const targetProgress = useRef(0);
  const displayedProgress = useRef(0);
  const counterRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);
  const timedOut = useRef(false);

  // Skip preloader for reduced-motion users
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) {
      setVisible(false);
    }
  }, []);

  // Lock scroll while preloader is visible
  useEffect(() => {
    if (!lenis) return;
    if (visible) {
      lenis.stop();
    } else {
      lenis.start();
    }
  }, [lenis, visible]);

  // Track video preload
  useEffect(() => {
    if (!visible) return;

    const videos: HTMLVideoElement[] = [];

    VIDEO_SOURCES.forEach((src) => {
      const video = document.createElement('video');
      video.src = src;
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.addEventListener(
        'canplaythrough',
        () => {
          videosLoaded.current += 1;
        },
        { once: true },
      );
      video.load();
      videos.push(video);
    });

    return () => {
      videos.forEach((v) => {
        v.src = '';
        v.load();
      });
    };
  }, [visible]);

  // 3s hard timeout
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      timedOut.current = true;
    }, TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  const exit = useCallback(() => {
    if (exiting) return;
    setExiting(true);
  }, [exiting]);

  // Smooth progress animation via rAF
  useEffect(() => {
    if (!visible) return;

    const tick = () => {
      // Compute target
      const threeProgress = isThreeReady || timedOut.current ? 1 : 0;
      const videoProgress =
        timedOut.current
          ? 1
          : videosLoaded.current / VIDEO_SOURCES.length;
      targetProgress.current =
        threeProgress * THREE_WEIGHT + videoProgress * VIDEO_WEIGHT;

      // Lerp displayed value
      displayedProgress.current +=
        (targetProgress.current - displayedProgress.current) * LERP_SPEED;

      // Clamp to 100
      if (displayedProgress.current > 0.995) {
        displayedProgress.current = 1;
      }

      // Update DOM directly (no React re-render)
      if (counterRef.current) {
        counterRef.current.textContent = `${Math.round(displayedProgress.current * 100)}%`;
      }

      // Trigger exit when fully loaded
      if (displayedProgress.current >= 1) {
        exit();
        return;
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [visible, isThreeReady, exit]);

  // Exit animation
  useGSAP(
    () => {
      if (!exiting || !containerRef.current || !dotRef.current) return;

      const tl = gsap.timeline({
        onComplete: () => setVisible(false),
      });

      tl.to(dotRef.current, {
        scale: 40,
        duration: 0.6,
        ease: 'power2.in',
      }).to(
        containerRef.current,
        {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
        },
        '-=0.2',
      );
    },
    { dependencies: [exiting] },
  );

  if (!visible) return null;

  return (
    <div className={styles.preloader} ref={containerRef} aria-live="polite">
      <div className={styles.preloader__center}>
        <div className={styles.preloader__dot} ref={dotRef} />
        <span className={styles.preloader__counter} ref={counterRef}>
          0%
        </span>
      </div>
    </div>
  );
}
