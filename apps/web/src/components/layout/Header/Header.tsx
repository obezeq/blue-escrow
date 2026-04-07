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

  const updateTheme = useCallback(() => {
    const sections = document.querySelectorAll(
      'section.o-section--blue, section.o-section--white',
    );

    // Find the section whose top is closest to (but above) the header zone
    let topmost: Element | null = null;
    let topmostTop = -Infinity;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      // Section overlaps the header zone (top 72px of viewport)?
      if (rect.top < HEADER_HEIGHT_PX && rect.bottom > 0 && rect.top > topmostTop) {
        topmost = section;
        topmostTop = rect.top;
      }
    });

    if (topmost) {
      const isBlue = topmost.classList.contains('o-section--blue');
      const newTheme = isBlue ? 'blue' : 'white';
      setTheme(newTheme);
      document.documentElement.dataset.sectionTheme = newTheme;
    }
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateTheme();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateTheme(); // Initial detection
    return () => window.removeEventListener('scroll', onScroll);
  }, [updateTheme]);

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
