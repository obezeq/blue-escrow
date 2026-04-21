'use client';

import { useRef, useState } from 'react';
import { HowItWorksAnimations } from './HowItWorksAnimations';
import { HIW_STEPS, LEDGER_LOGS } from './steps';
import styles from './HowItWorks.module.scss';

const STATE_CLASS: Record<string, string | undefined> = {
  draft: undefined,
  signed: undefined,
  locked: styles['hiw__state--locked'],
  delivered: styles['hiw__state--locked'],
  released: styles['hiw__state--released'],
};

export function HowItWorks() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const step = HIW_STEPS[active]!;
  const stateClass = STATE_CLASS[step.ledger.state] ?? '';
  const progress = ((active + 1) / HIW_STEPS.length) * 100;

  return (
    <section
      className={`o-section ${styles.hiw}`}
      id="hiw"
      aria-label="How it works in five steps"
    >
      <HowItWorksAnimations onPhaseChange={setActive} stageRef={stageRef}>
        <div className={styles.hiw__intro}>
          <div className={styles.hiw__wrap}>
            <div className={styles.hiw__head}>
              <div>
                <div className={styles.hiw__eyebrow} data-animate="eyebrow">
                  How it works
                </div>
                <h2 className={styles.hiw__heading} data-animate="heading">
                  Three people. One{' '}
                  <em className={styles.hiw__emphasis}>smart contract.</em>{' '}
                  Zero trust.
                </h2>
              </div>
              <p className={styles.hiw__subtitle} data-animate="subtitle">
                Scroll to watch one deal unfold, step by step. Nobody holds
                the money — the code does.
              </p>
            </div>
          </div>
        </div>

        <div ref={stageRef} className={styles.hiw__stage}>
          <div className={styles.hiw__grid}>
            <aside
              className={styles.hiw__ledger}
              aria-label={`Escrow #4821 · ${step.ledger.stateLabel}`}
            >
              <header className={styles.hiw__ledgerHead}>
                <div className={styles.hiw__ledgerId}>
                  <span>Contract</span>
                  <b>Escrow #4821</b>
                </div>
                <div
                  className={`${styles.hiw__state} ${stateClass}`}
                  aria-live="polite"
                >
                  {step.ledger.stateLabel}
                </div>
              </header>

              <div className={styles.hiw__amount}>
                <span className={styles.hiw__amountNumber}>
                  {step.ledger.amount.toLocaleString()}
                </span>
                <span className={styles.hiw__amountUnit}>USDC</span>
                <span className={styles.hiw__amountLabel}>Held by code</span>
              </div>

              <div className={styles.hiw__progress} aria-hidden="true">
                <i style={{ width: `${progress}%` }} />
              </div>

              <ul className={styles.hiw__logs}>
                {LEDGER_LOGS.map((log, i) => {
                  const isDone = i < step.ledger.activeLogIndex;
                  const isCurrent = i === step.ledger.activeLogIndex;
                  const stateCls = isDone
                    ? styles['hiw__log--done']
                    : isCurrent
                      ? styles['hiw__log--current']
                      : '';
                  return (
                    <li
                      key={log.time}
                      className={`${styles.hiw__log} ${stateCls}`}
                    >
                      <span className={styles.hiw__logTime}>{log.time}</span>
                      <span className={styles.hiw__logLabel}>
                        <span className={styles.hiw__logDot} aria-hidden="true" />
                        {log.label}
                      </span>
                      <span className={styles.hiw__logHash}>{log.hash}</span>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <div className={styles.hiw__scene}>
              <div className={styles.hiw__sceneHead}>
                <span>Live contract view</span>
                <span className={styles.hiw__sceneStep}>{step.narr.step}</span>
              </div>

              <div className={styles.hiw__sceneBody}>
                <div className={styles.hiw__actors}>
                  {(['client', 'mid', 'seller'] as const).map((pos) => {
                    const isActive =
                      step.activeActor === 'all' || step.activeActor === pos;
                    return (
                      <div
                        key={pos}
                        className={`${styles.hiw__actor} ${styles[`hiw__actor--${pos}`]} ${isActive ? styles['hiw__actor--active'] : ''}`}
                      >
                        <div className={styles.hiw__actorPuck}>
                          {pos === 'client' ? 'C' : pos === 'mid' ? 'M' : 'S'}
                        </div>
                        <div className={styles.hiw__actorRole}>
                          {pos === 'client'
                            ? 'Client'
                            : pos === 'mid'
                              ? 'Middleman'
                              : 'Seller'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.hiw__core}>
                  <div
                    className={`${styles.hiw__coreDisc} ${step.ledger.state === 'locked' ? styles['hiw__coreDisc--locked'] : ''}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="4" y="10" width="16" height="10" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                    <span className={styles.hiw__coreLabel}>
                      Smart contract
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.hiw__narration} aria-live="polite">
                <div className={styles.hiw__narrationText}>
                  <div className={styles.hiw__narrationStep}>
                    {step.narr.step}
                  </div>
                  <h3 className={styles.hiw__narrationTitle}>
                    {step.narr.title}
                  </h3>
                  <p className={styles.hiw__narrationBody}>{step.narr.body}</p>
                </div>
              </div>
            </div>
          </div>

          <nav
            className={styles.hiw__rail}
            aria-label="How it works step rail"
          >
            {HIW_STEPS.map((s) => (
              <button
                key={s.index}
                type="button"
                className={`${styles.hiw__railButton} ${active === s.index ? styles['hiw__railButton--active'] : ''}`}
                aria-pressed={active === s.index}
                onClick={() => setActive(s.index)}
              >
                <span className={styles.hiw__railNum}>{s.rail.num}</span>
                {s.rail.label}
              </button>
            ))}
          </nav>
        </div>
      </HowItWorksAnimations>
    </section>
  );
}
