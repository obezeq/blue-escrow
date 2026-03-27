'use client';

import { useRef, useEffect } from 'react';
import { gsap } from '@/animations/config/gsap-register';
import { useScrollProgress } from '@/providers/LenisProvider';
import styles from './ScrollProgressIndicator.module.scss';

export function ScrollProgressIndicator() {
  const barRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useScrollProgress();

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const tickerCallback = () => {
      bar.style.transform = `scaleX(${scrollProgressRef.current})`;
    };

    gsap.ticker.add(tickerCallback);
    return () => {
      gsap.ticker.remove(tickerCallback);
    };
  }, [scrollProgressRef]);

  return (
    <div className={styles.progress} role="progressbar" aria-label="Scroll progress">
      <div ref={barRef} className={styles.progress__bar} />
    </div>
  );
}
