import { TrustLayerAnimations } from './TrustLayerAnimations';
import styles from './TrustLayer.module.scss';

interface ProofStat {
  count: number;
  decimals: number;
  start: string;
  unit?: string;
  label: string;
  sub: string;
  key: string;
}

// Verbatim from v6 Blue Escrow v6.html:1610-1629.
const PROOF_STATS: ProofStat[] = [
  {
    key: 'settled',
    count: 12.4,
    decimals: 1,
    start: '0.0',
    unit: 'M',
    label: 'USDC settled',
    sub: 'Across 3,214 deals this quarter',
  },
  {
    key: 'fee',
    count: 0.33,
    decimals: 2,
    start: '0.00',
    unit: '%',
    label: 'Protocol fee',
    sub: 'Flat. No tiers. No hidden cuts.',
  },
  {
    key: 'middlemen',
    count: 180,
    decimals: 0,
    start: '0',
    unit: '+',
    label: 'Verified middlemen',
    sub: 'With on-chain reputation',
  },
  {
    key: 'lost',
    count: 0,
    decimals: 0,
    start: '0',
    label: 'Funds ever lost',
    sub: 'Audited. Open-source. Immutable.',
  },
];

const MARQUEE_PHRASE = 'TRUSTLESS  ·  BORDERLESS  ·  UNCENSORABLE  ·  ';

export function TrustLayer() {
  return (
    <section
      className={`o-section ${styles.proof}`}
      id="proof"
      aria-label="Protocol proof and on-chain metrics"
    >
      <TrustLayerAnimations>
        <div className={styles.proof__wrap}>
          <div className={styles.proof__head}>
            <div>
              <div className={styles.proof__eyebrow} data-animate="eyebrow">
                Proof
              </div>
              <h2 className={styles.proof__heading} data-animate="heading">
                The numbers{' '}
                <em className={styles.proof__emphasis}>aren&apos;t a pitch.</em>{' '}
                They&apos;re on-chain.
              </h2>
            </div>
            <p className={styles.proof__subtitle} data-animate="subtitle">
              Everything below is verifiable at block level. Read the contract,
              check the math yourself.
            </p>
          </div>

          <div className={styles.proof__row}>
            {PROOF_STATS.map((stat) => (
              <div
                key={stat.key}
                className={styles.proof__item}
                data-animate="item"
              >
                <div
                  className={styles.proof__num}
                  data-count={stat.count}
                  data-decimals={stat.decimals}
                  aria-label={`${stat.count}${stat.unit ?? ''} ${stat.label}`}
                >
                  <span className={styles.proof__number} data-animate-number>
                    {stat.start}
                  </span>
                  {stat.unit ? (
                    <span className={styles.proof__unit}>{stat.unit}</span>
                  ) : null}
                </div>
                <div className={styles.proof__label}>{stat.label}</div>
                <div className={styles.proof__sub}>{stat.sub}</div>
              </div>
            ))}
          </div>

          <div className={styles.proof__marquee} aria-hidden="true">
            <div
              className={styles.proof__marqueeTrack}
              data-animate="marquee-track"
            >
              <span>{MARQUEE_PHRASE}</span>
              <span>{MARQUEE_PHRASE}</span>
              <span>{MARQUEE_PHRASE}</span>
            </div>
          </div>
        </div>
      </TrustLayerAnimations>
    </section>
  );
}
