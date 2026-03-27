'use client';

import { useRef, type MouseEvent } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { Button, type ButtonProps } from '../Button';
import styles from './MagneticButton.module.scss';

interface MagneticButtonProps extends ButtonProps {
  strength?: number;
}

export function MagneticButton({
  strength = 8,
  ...buttonProps
}: MagneticButtonProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDesktop = useRef(false);

  useGSAP(
    () => {
      const el = wrapperRef.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: MATCH_MEDIA.desktop,
          noReducedMotion: MATCH_MEDIA.noReducedMotion,
        },
        (context) => {
          const { desktop, noReducedMotion } = context.conditions!;
          isDesktop.current = Boolean(desktop && noReducedMotion);
        },
      );

      return () => mm.revert();
    },
    { scope: wrapperRef },
  );

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDesktop.current || !wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distX = e.clientX - centerX;
    const distY = e.clientY - centerY;

    const maxDist = Math.max(rect.width, rect.height) / 2;
    const normalizedX = (distX / maxDist) * strength;
    const normalizedY = (distY / maxDist) * strength;

    gsap.to(wrapperRef.current, {
      x: normalizedX,
      y: normalizedY,
      duration: 0.3,
      ease: 'power3.out',
    });
  };

  const handleMouseLeave = () => {
    if (!isDesktop.current || !wrapperRef.current) return;

    gsap.to(wrapperRef.current, {
      x: 0,
      y: 0,
      duration: 0.6,
      ease: 'elastic.out(1, 0.3)',
    });
  };

  return (
    <div
      ref={wrapperRef}
      className={styles.magnetic}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Button {...buttonProps} />
    </div>
  );
}
