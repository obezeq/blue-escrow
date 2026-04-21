import { HeroAnimations } from './HeroAnimations';
import styles from './HeroSection.module.scss';

interface MetaCol {
  label: string;
  primary: React.ReactNode;
  mono: string;
}

const META_COLS: MetaCol[] = [
  {
    label: 'Money held by',
    primary: 'Smart contract',
    mono: '0x7a2f…e91c',
  },
  {
    label: 'Decided by',
    primary: 'Human middleman',
    mono: '3-of-3 signature',
  },
  {
    label: 'Protocol fee',
    primary: (
      <>
        <b>0.33%</b> flat
      </>
    ),
    mono: '+ chosen middleman fee',
  },
  {
    label: 'Avg settlement',
    primary: <b>2 min</b>,
    mono: 'after client signs release',
  },
];

interface TickerItem {
  kind: 'event' | 'detail' | 'dot' | 'ok';
  text?: string;
}

// Verbatim from v6 Blue Escrow v6.html:1320-1347. The dot separators render
// a bullet and flip color (accent or ok) per v6 styling.
const TICKER_ITEMS: TickerItem[] = [
  { kind: 'ok', text: '●' },
  { kind: 'event', text: 'Deal #4821 signed' },
  { kind: 'detail', text: 'Client → Middleman → Seller' },
  { kind: 'detail', text: '2,400 USDC locked' },
  { kind: 'dot', text: '●' },
  { kind: 'event', text: 'Middleman @archer verified' },
  { kind: 'detail', text: 'REP 4.98 · 214 deals' },
  { kind: 'dot', text: '●' },
  { kind: 'event', text: 'Deal #4820 released' },
  { kind: 'detail', text: '890 USDC → seller' },
  { kind: 'dot', text: '●' },
  { kind: 'event', text: 'Deal #4819 refund approved' },
  { kind: 'detail', text: '1,200 USDC → client' },
  { kind: 'dot', text: '●' },
  { kind: 'event', text: 'New middleman onboarded' },
  { kind: 'detail', text: '@serafina · 2% fee' },
  { kind: 'dot', text: '●' },
  { kind: 'event', text: 'Deal #4821 signed' },
  { kind: 'detail', text: '2,400 USDC locked' },
  { kind: 'dot', text: '●' },
  { kind: 'event', text: 'Middleman @archer verified' },
  { kind: 'detail', text: 'REP 4.98 · 214 deals' },
  { kind: 'dot', text: '●' },
  { kind: 'event', text: 'Deal #4820 released' },
  { kind: 'detail', text: '890 USDC → seller' },
  { kind: 'dot', text: '●' },
];

function renderTicker(prefix: string) {
  return TICKER_ITEMS.map((item, i) => {
    const className =
      item.kind === 'dot'
        ? styles['ticker__dot']
        : item.kind === 'ok'
          ? styles['ticker__ok']
          : undefined;
    return (
      <span key={`${prefix}-${i}`} className={className}>
        {item.text}
      </span>
    );
  });
}

export function HeroSection() {
  return (
    <header
      className={styles.hero}
      id="hero"
      aria-label="Decentralized escrow protocol"
    >
      <div className={styles.hero__bg} aria-hidden="true" />

      <div className={styles.hero__orbit} aria-hidden="true">
        <svg viewBox="0 0 1000 1000">
          <g className={styles.hero__orbSpin}>
            <circle
              className={styles.hero__orbRing}
              cx="500"
              cy="500"
              r="480"
            />
            <circle
              className={styles.hero__orbDot}
              cx="500"
              cy="20"
              r="3"
            />
          </g>
          <g className={styles.hero__orbSpinReverse}>
            <circle
              className={`${styles.hero__orbRing} ${styles['hero__orbRing--r2']}`}
              cx="500"
              cy="500"
              r="360"
            />
            <circle
              className={styles.hero__orbDot}
              cx="860"
              cy="500"
              r="2.5"
            />
          </g>
          <g className={styles.hero__orbSpin}>
            <circle
              className={`${styles.hero__orbRing} ${styles['hero__orbRing--r3']}`}
              cx="500"
              cy="500"
              r="240"
            />
          </g>
          <circle
            className={styles.hero__orbRing}
            cx="500"
            cy="500"
            r="130"
            strokeDasharray="1 8"
          />
        </svg>
      </div>

      <div className={styles.hero__fade} aria-hidden="true" />

      <HeroAnimations>
        <div className={styles.hero__eyebrow} data-animate="eyebrow">
          <span className={styles.hero__chipDot}>Escrow Protocol v1.0</span>
          <span className={styles.hero__chipSep}>/</span>
          <span>Live on Arbitrum</span>
          <span className={styles.hero__chipSep}>/</span>
          <span>214 deals this month</span>
        </div>

        <div className={styles.hero__center}>
          <h1 className={styles.hero__title}>
            <span className={styles.hero__line}>
              <span className={styles.hero__word}>The middleman</span>
            </span>
            <span className={styles.hero__line}>
              <span
                className={`${styles.hero__word} ${styles['hero__word--italic']}`}
              >
                that cannot
              </span>{' '}
              <span className={styles.hero__word}>run.</span>
            </span>
          </h1>
        </div>

        <p className={styles.hero__sub} data-animate="sub">
          Escrow with a real human middleman — but the{' '}
          <b>smart contract</b> holds the money. They judge. Code pays.{' '}
          <em>Nobody can disappear with your funds.</em>
        </p>

        <div className={styles.hero__ctas} data-animate="ctas">
          <a
            href="#closing"
            className={`${styles.hero__btn} ${styles['hero__btn--primary']}`}
          >
            Start a deal <span aria-hidden="true">→</span>
          </a>
          <a
            href="#hiw"
            className={`${styles.hero__btn} ${styles['hero__btn--ghost']}`}
          >
            See how it works
          </a>
        </div>

        <div className={styles.hero__bottom} data-animate="bottom">
          <div className={styles.hero__meta}>
            {META_COLS.map((col) => (
              <div key={col.label} className={styles.hero__metaCol}>
                <div className={styles.hero__metaKey}>{col.label}</div>
                <div className={styles.hero__metaValue}>
                  {col.primary}
                  <span className={styles.hero__metaMono}>{col.mono}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={styles.ticker}
          data-animate="ticker"
          aria-hidden="true"
        >
          <div className={styles.ticker__track}>
            {renderTicker('a')}
            {renderTicker('b')}
          </div>
        </div>
      </HeroAnimations>
    </header>
  );
}
