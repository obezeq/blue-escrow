'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from '@/animations/config/gsap-register';
import { ThemeToggle } from '@/components/ui';
import styles from './Header.module.scss';

const SCROLL_THRESHOLD = 40;

export function Header() {
  const headerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!headerRef.current) return;
    const header = headerRef.current;
    const scrolledClass = styles['header--scrolled'] ?? 'header--scrolled';

    const trigger = ScrollTrigger.create({
      start: 'top -40',
      end: 'max',
      onUpdate: (self) => {
        if (self.scroll() > SCROLL_THRESHOLD) {
          header.classList.add(scrolledClass);
        } else {
          header.classList.remove(scrolledClass);
        }
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <header ref={headerRef} className={styles.header}>
      <nav aria-label="Main navigation" className={styles.header__nav}>
        <Link href="/" className={styles.header__logo}>
          <span className={styles.header__logoDot} aria-hidden="true" />
          <span>
            Blue <span className={styles.header__logoItalic}>Escrow</span>
          </span>
        </Link>

        <ul className={styles.header__links}>
          <li>
            <Link href="#problem" className={styles.header__link}>
              The problem
            </Link>
          </li>
          <li>
            <Link href="#hiw" className={styles.header__link}>
              How it works
            </Link>
          </li>
          <li>
            <Link href="#compare" className={styles.header__link}>
              Compare
            </Link>
          </li>
          <li>
            <Link href="#fees" className={styles.header__link}>
              Fees
            </Link>
          </li>
          <li>
            <Link href="#faq" className={styles.header__link}>
              FAQ
            </Link>
          </li>
        </ul>

        <div className={styles.header__right}>
          <ThemeToggle />
          <Link href="/app" className={styles.header__cta}>
            Launch app <span aria-hidden="true">→</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
