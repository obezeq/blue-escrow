import { FeeSectionAnimations } from './FeeSectionAnimations';
import styles from './FeeSection.module.scss';

const COMPETITORS: { label: string; rate: string }[] = [
  { label: 'Escrow.com', rate: 'up to 3.25%' },
  { label: 'Upwork', rate: 'up to 20%' },
  { label: 'Stripe', rate: '2.9% + 30¢' },
];

export function FeeSection() {
  return (
    <section
      className={`o-section ${styles.fees}`}
      id="fees"
      aria-label="Platform fees"
    >
      <FeeSectionAnimations>
        <div className={styles.fees__wrap}>
          <div className={styles.fees__grid}>
            <div
              className={styles.fees__number}
              data-animate="number"
              aria-label="0.33 percent"
            >
              0<span className={styles.fees__dot}>.</span>33
              <sup className={styles.fees__sup}>%</sup>
            </div>

            <div className={styles.fees__copy}>
              <p
                className={styles.fees__eyebrow}
                data-animate="eyebrow"
              >
                The only fee
              </p>
              <h2 className={styles.fees__heading} data-animate="heading">
                A third of{' '}
                <em className={styles.fees__emphasis}>a percent.</em>{' '}
                That&apos;s the whole number.
              </h2>
              <p className={styles.fees__body} data-animate="body">
                No subscriptions. No withdrawal fees. No hidden FX. 0.33% of
                the deal, taken by the contract at release — before anybody
                else is paid.
              </p>
              <p className={styles.fees__body} data-animate="body">
                The middleman sets their own fee on top (usually 1&thinsp;–&thinsp;3%).
                Transparent, negotiated, and shown to everyone before the deal
                is signed.
              </p>
              <div className={styles.fees__row} data-animate="row">
                {COMPETITORS.map((c) => (
                  <div key={c.label} className={styles.fees__competitor}>
                    <b>{c.label}</b>
                    {c.rate}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FeeSectionAnimations>
    </section>
  );
}
