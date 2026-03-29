'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { MagneticButton } from '@/components/ui/MagneticButton';
import styles from './Header.module.scss';

type HeaderTheme = 'blue' | 'white';

const HEADER_HEIGHT_PX = 72; // var(--header-height) = 4.5rem ≈ 72px

export function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<HeaderTheme>('blue');
  const [menuOpen, setMenuOpen] = useState(false);

  const setupObserver = useCallback(() => {
    const sections = document.querySelectorAll(
      '.o-section--blue, .o-section--white',
    );
    if (sections.length === 0) return;

    const rootMarginBottom = -(window.innerHeight - HEADER_HEIGHT_PX);

    const observer = new IntersectionObserver(
      (entries) => {
        // Among intersecting entries, pick the one closest to the header
        let closest: IntersectionObserverEntry | null = null;
        let closestDist = Infinity;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const dist = Math.abs(entry.boundingClientRect.top);
          if (dist < closestDist) {
            closestDist = dist;
            closest = entry;
          }
        }

        if (closest) {
          const isBlue = closest.target.classList.contains('o-section--blue');
          const newTheme = isBlue ? 'blue' : 'white';
          setTheme(newTheme);
          document.documentElement.dataset.sectionTheme = newTheme;
        }
      },
      {
        rootMargin: `0px 0px ${rootMarginBottom}px 0px`,
        threshold: 0,
      },
    );

    sections.forEach((section) => observer.observe(section));
    return observer;
  }, []);

  useEffect(() => {
    let observer = setupObserver();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        observer?.disconnect();
        observer = setupObserver();
      }, 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [setupObserver]);

  const themeClass =
    theme === 'blue' ? styles['header--on-blue'] : styles['header--on-white'];

  return (
    <header
      ref={headerRef}
      className={`${styles.header} ${themeClass}`}
    >
      <nav aria-label="Main navigation" className={styles.header__nav}>
        <Link href="/" className={styles.header__logo}>
          Blue Escrow
        </Link>

        <div
          className={`${styles.header__links} ${menuOpen ? styles['header__links--open'] : ''}`}
        >
          <Link href="#how-it-works" className={styles.header__link}>
            How It Works
          </Link>
          <Link href="/docs" className={styles.header__link}>
            Docs
          </Link>
          <MagneticButton href="/app" variant="primary" size="sm">
            Launch App
          </MagneticButton>
        </div>

        <button
          className={styles.header__hamburger}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
        >
          <span className={styles.header__hamburgerLine} />
          <span className={styles.header__hamburgerLine} />
          <span className={styles.header__hamburgerLine} />
        </button>
      </nav>
    </header>
  );
}
