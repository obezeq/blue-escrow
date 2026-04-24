'use client';

import { useRef } from 'react';
import { HowItWorksAnimations } from './HowItWorksAnimations';
import { HiwDiagram } from './HiwDiagram';
import { HiwPhaseDiagram } from './HiwPhaseDiagram';
import { HIW_STEPS, LEDGER_LOGS } from './data';
import { HiwProvider, useHiw } from './context/HiwContext';
import { useOutcomeBranch } from './animations/useOutcomeBranch';
import { SafeguardsPanel } from './Safeguards/SafeguardsPanel';
import styles from './HowItWorks.module.scss';

const STATE_CLASS: Record<string, string | undefined> = {
  draft: undefined,
  signed: undefined,
  locked: styles['hiw__state--locked'],
  delivered: styles['hiw__state--locked'],
  released: styles['hiw__state--released'],
};

export function HowItWorks() {
  return (
    <HiwProvider>
      <HowItWorksContent />
    </HiwProvider>
  );
}

function HowItWorksContent() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinHostRef = useRef<HTMLDivElement>(null);
  const { phase: active, setPhase: setActive, outcome } = useHiw();
  useOutcomeBranch({ targetRef: sectionRef, outcome });
  const step = HIW_STEPS[active]!;
  const stateClass = STATE_CLASS[step.ledger.state] ?? '';
  const progress = ((active + 1) / HIW_STEPS.length) * 100;

  return (
    <section
      ref={sectionRef}
      className={`o-section ${styles.hiw}`}
      id="hiw"
      aria-label="How it works in five steps"
    >
      <HowItWorksAnimations onPhaseChange={setActive} pinHostRef={pinHostRef}>
        <div ref={pinHostRef} className={styles.hiw__pinHost}>
          <header className={styles.hiw__intro}>
            <div className={styles.hiw__eyebrow} data-animate="eyebrow">
              How it works
            </div>
            <h2 className={styles.hiw__heading} data-animate="heading">
              Three people. One{' '}
              <em className={styles.hiw__emphasis}>smart contract.</em>{' '}
              Zero trust.
            </h2>
          </header>

          <div className={styles.hiw__stage}>
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
                <span
                  className={styles.hiw__amountNumber}
                  data-hiw-ledger="amount"
                >
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
                <HiwDiagram />
              </div>

              <div className={styles.hiw__narration}>
                <div className={styles.hiw__narrationText}>
                  <div className={styles.hiw__narrationStep}>
                    {step.narr.step}
                  </div>
                  <h3
                    className={styles.hiw__narrationTitle}
                    data-animate="narr-title"
                  >
                    {step.narr.title}
                  </h3>
                  <p
                    className={styles.hiw__narrationBody}
                    data-animate="narr-body"
                  >
                    {step.narr.body}
                  </p>
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
                data-hiw-rail={s.index}
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
        </div>

        {/*
          Mobile-only intro — the desktop intro lives INSIDE .hiw__pinHost
          (so the pinned experience opens with the heading visible), but
          pinHost is display:none at <900px width. Rendering a second
          intro here means mobile users still see "HOW IT WORKS / Three
          people. One smart contract. Zero trust." above the step deck.
          aria-hidden on the duplicate prevents screen readers from
          reading the heading twice — the desktop one stays in the
          accessibility tree.
        */}
        <header
          className={`${styles.hiw__intro} ${styles['hiw__intro--mobile']}`}
          aria-hidden="true"
        >
          <div className={styles.hiw__eyebrow}>How it works</div>
          <h2 className={styles.hiw__heading}>
            Three people. One{' '}
            <em className={styles.hiw__emphasis}>smart contract.</em>{' '}
            Zero trust.
          </h2>
        </header>

        <div
          className={styles.hiw__deck}
          aria-label="How it works — step deck"
        >
          {HIW_STEPS.map((s) => {
            const stateCls = STATE_CLASS[s.ledger.state] ?? '';
            return (
              <section
                key={s.index}
                className={styles.hiw__phaseCard}
                data-hiw-phase-card={s.index}
                aria-labelledby={`hiw-card-${s.index}-title`}
              >
                <header className={styles.hiw__phaseCardHead}>
                  <div
                    className={styles.hiw__phaseCounter}
                    data-animate
                  >
                    {s.narr.step}
                  </div>
                  <h3
                    id={`hiw-card-${s.index}-title`}
                    className={styles.hiw__phaseCardTitle}
                    data-animate
                  >
                    {s.narr.title}
                  </h3>
                  <p
                    className={styles.hiw__phaseCardBody}
                    data-animate
                  >
                    {s.narr.body}
                  </p>
                </header>

                <div
                  className={styles.hiw__phaseCardDiagram}
                  data-animate
                >
                  <HiwPhaseDiagram phase={s.index} />
                </div>

                <dl
                  className={styles.hiw__phaseCardLedger}
                  data-animate
                >
                  <div>
                    <dt>Contract</dt>
                    <dd>Escrow #4821</dd>
                  </div>
                  <div>
                    <dt>State</dt>
                    <dd className={`${styles.hiw__state} ${stateCls}`}>
                      {s.ledger.stateLabel}
                    </dd>
                  </div>
                  <div>
                    <dt>Amount</dt>
                    <dd>
                      {s.ledger.amount.toLocaleString()}{' '}
                      <small>USDC</small>
                    </dd>
                  </div>
                </dl>
              </section>
            );
          })}
          <nav
            className={styles.hiw__phaseNav}
            aria-label="Phase navigation"
          >
            {HIW_STEPS.map((s) => (
              <a
                key={s.index}
                href={`#hiw-card-${s.index}-title`}
                className={styles.hiw__phasePip}
                aria-label={`Go to ${s.rail.label}`}
              >
                <span aria-hidden="true">●</span>
              </a>
            ))}
          </nav>
        </div>
      </HowItWorksAnimations>
      <SafeguardsPanel />
    </section>
  );
}
