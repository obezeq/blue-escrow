'use client';

import { useRef, useEffect } from 'react';
import { gsap } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import styles from './CustomCursor.module.scss';

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], [data-cursor-hover]';

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const isActive = useRef(false);

  useEffect(() => {
    const dot = dotRef.current;
    const circle = circleRef.current;
    if (!dot || !circle) return;

    // Gate: only activate on fine-pointer devices without reduced motion
    const finePointer = window.matchMedia('(pointer: fine)');
    const reducedMotion = window.matchMedia(MATCH_MEDIA.reducedMotion);

    if (!finePointer.matches || reducedMotion.matches) return;

    // Wait for first mouse event to confirm input device
    let confirmed = false;

    const dotX = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3.out' });
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3.out' });
    const circleX = gsap.quickTo(circle, 'x', { duration: 0.3, ease: 'power3.out' });
    const circleY = gsap.quickTo(circle, 'y', { duration: 0.3, ease: 'power3.out' });

    const activate = () => {
      if (isActive.current) return;
      isActive.current = true;
      document.documentElement.style.cursor = 'none';
      gsap.set([dot, circle], { opacity: 1 });
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;

      if (!confirmed) {
        confirmed = true;
        activate();
      }

      dotX(e.clientX);
      dotY(e.clientY);
      circleX(e.clientX);
      circleY(e.clientY);
    };

    const handlePointerOver = (e: PointerEvent) => {
      if (!confirmed) return;
      const target = (e.target as HTMLElement).closest?.(INTERACTIVE_SELECTOR);
      if (target) {
        gsap.to(dot, {
          width: 48,
          height: 48,
          backgroundColor: 'transparent',
          border: '2px solid var(--blue-primary)',
          duration: 0.25,
          ease: 'power3.out',
        });
        gsap.to(circle, { opacity: 0, duration: 0.15 });
      }
    };

    const handlePointerOut = (e: PointerEvent) => {
      if (!confirmed) return;
      const target = (e.target as HTMLElement).closest?.(INTERACTIVE_SELECTOR);
      if (target) {
        gsap.to(dot, {
          width: 6,
          height: 6,
          backgroundColor: 'var(--blue-primary)',
          border: 'none',
          duration: 0.25,
          ease: 'power3.out',
        });
        gsap.to(circle, { opacity: 1, duration: 0.15 });
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      document.documentElement.style.cursor = '';
      isActive.current = false;
    };
  }, []);

  return (
    <div className={styles.cursor} aria-hidden="true">
      <div ref={dotRef} className={styles.cursor__dot} />
      <div ref={circleRef} className={styles.cursor__circle} />
    </div>
  );
}
