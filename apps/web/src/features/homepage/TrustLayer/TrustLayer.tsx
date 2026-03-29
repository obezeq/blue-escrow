import { TrustLayerAnimations } from './TrustLayerAnimations';
import styles from './TrustLayer.module.scss';

// ---------------------------------------------------------------------------
// Solidity token types for manual syntax highlighting
// ---------------------------------------------------------------------------

type TokenType = 'keyword' | 'type' | 'comment' | 'var';

interface Token {
  text: string;
  type: TokenType;
}

/** Key line index (0-based) that gets the glow highlight */
const KEY_LINE_INDEX = 3;

const CODE_LINES: Token[][] = [
  [
    { text: 'function', type: 'keyword' },
    { text: ' ', type: 'var' },
    { text: 'resolve', type: 'var' },
    { text: '(', type: 'var' },
    { text: 'address', type: 'type' },
    { text: ' to) ', type: 'var' },
    { text: 'external', type: 'keyword' },
    { text: ' {', type: 'var' },
  ],
  [
    { text: '    ', type: 'var' },
    { text: 'Deal', type: 'type' },
    { text: ' ', type: 'var' },
    { text: 'storage', type: 'keyword' },
    { text: ' deal = deals[dealId];', type: 'var' },
  ],
  [
    { text: '    ', type: 'var' },
    { text: 'require', type: 'keyword' },
    { text: '(msg.sender == middleman);', type: 'var' },
  ],
  [
    { text: '    ', type: 'var' },
    { text: 'require', type: 'keyword' },
    { text: '(to == client || to == seller);', type: 'var' },
  ],
  [
    { text: '    ', type: 'var' },
    { text: '// Funds can ONLY go to client or seller', type: 'comment' },
  ],
  [
    { text: '    ', type: 'var' },
    { text: '// NEVER to the middleman. Ever.', type: 'comment' },
  ],
  [
    { text: '    usdc.', type: 'var' },
    { text: 'transfer', type: 'keyword' },
    { text: '(to, deal.amount);', type: 'var' },
  ],
  [{ text: '}', type: 'var' }],
];

const STYLE_MAP: Record<TokenType, string> = {
  keyword: styles.code__keyword,
  type: styles.code__type,
  comment: styles.code__comment,
  var: styles.code__var,
};

// ---------------------------------------------------------------------------
// Stat data
// ---------------------------------------------------------------------------

interface Stat {
  value: string;
  caption: string;
  animateKey: string;
  primary?: boolean;
}

const STATS: Stat[] = [
  {
    value: '0.33%',
    caption: 'Platform fee',
    animateKey: 'counter-fee',
    primary: true,
  },
  {
    value: '$0',
    caption: 'Middleman can take',
    animateKey: 'counter-middleman',
    primary: true,
  },
  {
    value: '100%',
    caption: 'On-chain transparency',
    animateKey: 'counter-onchain',
  },
  {
    value: '33 days',
    caption: 'Security audit',
    animateKey: 'counter-audit',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TrustLayer() {
  return (
    <section
      className={`o-section o-section--white ${styles.trust}`}
      id="trust-layer"
      aria-label="Trust and transparency"
    >
      <TrustLayerAnimations>
        <div className="o-container">
          <div className={`o-grid o-grid--2 ${styles.trust__grid}`}>
            {/* LEFT — Solidity code block */}
            <div data-animate="code-block">
              <pre className={styles.trust__pre}>
                <code className={styles.trust__codeInner}>
                  {CODE_LINES.map((line, lineIdx) => {
                    const isKeyLine = lineIdx === KEY_LINE_INDEX;
                    return (
                      <span
                        key={lineIdx}
                        data-line={lineIdx}
                        {...(isKeyLine
                          ? {
                              'data-highlight': 'key-line',
                              className: styles.trust__keyLine,
                            }
                          : {})}
                      >
                        {line.map((token, tokenIdx) =>
                          [...token.text].map((char, charIdx) => (
                            <span
                              key={`${tokenIdx}-${charIdx}`}
                              data-char
                              className={STYLE_MAP[token.type]}
                            >
                              {char}
                            </span>
                          )),
                        )}
                        {lineIdx < CODE_LINES.length - 1 ? '\n' : ''}
                      </span>
                    );
                  })}
                </code>
              </pre>
            </div>

            {/* RIGHT — Stats */}
            <div className={styles.trust__stats} data-animate="stats">
              {STATS.map((stat) => (
                <div key={stat.animateKey} className={styles.trust__statCard}>
                  <span
                    className={`${styles.trust__statNumber}${stat.primary ? ` ${styles['trust__statNumber--primary']}` : ''}`}
                    data-animate={stat.animateKey}
                  >
                    {stat.value}
                  </span>
                  <p className={styles.trust__statCaption}>{stat.caption}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </TrustLayerAnimations>
    </section>
  );
}
