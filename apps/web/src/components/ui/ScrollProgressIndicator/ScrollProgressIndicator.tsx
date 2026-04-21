'use client';

import { useRef, useEffect } from 'react';
import { gsap } from '@/animations/config/gsap-register';
import { useScrollProgress } from '@/providers/LenisProvider';
import styles from './ScrollProgressIndicator.module.scss';

export function ScrollProgressIndicator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useScrollProgress();

  useEffect(() => {
    const container = containerRef.current;
    const bar = barRef.current;
    if (!container || !bar) return;

    let lastPct = -1;
    const tickerCallback = () => {
      const progress = scrollProgressRef.current;
      bar.style.transform = `scaleX(${progress})`;
      const pct = Math.round(progress * 100);
      if (pct !== lastPct) {
        container.setAttribute('aria-valuenow', String(pct));
        lastPct = pct;
      }
    };

    gsap.ticker.add(tickerCallback);
    return () => {
      gsap.ticker.remove(tickerCallback);
    };
  }, [scrollProgressRef]);

  return (
    <div
      ref={containerRef}
      className={styles.progress}
      role="progressbar"
      aria-label="Scroll progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <div ref={barRef} className={styles.progress__bar} />
    </div>
  );
}
