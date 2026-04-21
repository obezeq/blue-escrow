import Link from 'next/link';
import styles from './Footer.module.scss';

const FOOTER_LINKS = {
  Product: [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
  ],
  Resources: [
    { label: 'Docs', href: '/docs' },
    { label: 'GitHub', href: 'https://github.com/blue-escrow' },
    { label: 'Blog', href: '/blog' },
  ],
  Legal: [
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Contact', href: '/contact' },
  ],
} as const;

export function Footer() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.footer__inner}>
        <div className={styles.footer__columns}>
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category} className={styles.footer__column}>
              <h3 className={styles.footer__columnTitle}>{category}</h3>
              <ul className={styles.footer__list}>
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={styles.footer__link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.footer__bottom}>
          <span className={styles.footer__logo}>Blue Escrow</span>
          <span className={styles.footer__copyright}>
            &copy; {new Date().getFullYear()} Blue Escrow
          </span>
          <span className={styles.footer__badge}>Built on Arbitrum</span>
        </div>
      </div>
    </footer>
  );
}
