import Link from 'next/link';
import styles from './Footer.module.scss';

// v6 footer IA (Blue Escrow v6.html:1754-1767). Three link columns +
// tagline column; bottom status bar + legal quick-links.
interface FooterLink {
  label: string;
  href: string;
}

const TAGLINE =
  'Programmable trust for people who trade with strangers. One contract. Three signatures. Zero middlemen who can run.';

const FOOTER_COLS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', href: '#hiw' },
      { label: 'Compare', href: '#compare' },
      { label: 'Fees', href: '#fees' },
      { label: 'Receipts', href: '#receipts' },
    ],
  },
  {
    heading: 'Protocol',
    links: [
      { label: 'Contract', href: '/docs/contract' },
      { label: 'Audits', href: '/docs/audits' },
      { label: 'Source', href: 'https://github.com/obezeq/blue-escrow' },
      { label: 'Docs', href: '/docs' },
    ],
  },
  {
    heading: 'Directory',
    links: [
      { label: 'Find a middleman', href: '/middlemen' },
      { label: 'Become one', href: '/middlemen/apply' },
      { label: 'Leaderboard', href: '/middlemen/leaderboard' },
      { label: 'Reputation', href: '/docs/reputation' },
    ],
  },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Bug bounty', href: '/security' },
  { label: 'Legal', href: '/legal' },
];

export function Footer() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.footer__wrap}>
        <div className={styles.footer__giant} aria-hidden="true">
          Blue{' '}
          <span className={styles.footer__giantEmphasis}>Escrow.</span>
        </div>

        <div className={styles.footer__top}>
          <div>
            <p className={styles.footer__tagline}>{TAGLINE}</p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.heading} className={styles.footer__col}>
              <h4 className={styles.footer__colHeading}>{col.heading}</h4>
              <ul className={styles.footer__list}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={styles.footer__link}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.footer__bottom}>
          <div className={styles.footer__status} aria-live="polite">
            All systems operational · Arbitrum
          </div>
          <nav
            className={styles.footer__legal}
            aria-label="Legal and security links"
          >
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={styles.footer__legalLink}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
