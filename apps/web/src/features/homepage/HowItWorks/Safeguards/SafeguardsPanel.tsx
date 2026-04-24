'use client';

/**
 * Safeguards · What if it goes wrong?
 *
 * Four-tab panel that sits directly under the pinned happy-path stage.
 * Each tab corresponds to one non-Delivery `ResolutionType` in
 * `Escrow.sol`:
 *
 *   - Refund           · seller accepts refund (ResolutionType.Refund)
 *   - Dispute → Buyer  · middleman sides with client (MiddlemanBuyer)
 *   - Dispute → Seller · middleman sides with seller (MiddlemanSeller)
 *   - Timeout          · permissionless executeTimeout after deadline
 *
 * Clicking a chip toggles the outcome in `HiwContext`. A second click
 * on the active chip returns to happy-path (outcome=null) — this keeps
 * the tablist keyboard-friendly without requiring a separate "back to
 * happy path" affordance. Each tabpanel carries the canonical
 * `role="tabpanel"` + `aria-labelledby` + `hidden` contract so screen
 * readers ignore the three inactive panels entirely.
 *
 * Fee-note rendering colour-codes seller-win branches (ResolutionType
 * Delivery + MiddlemanSeller → fees apply) vs client-win (Refund,
 * MiddlemanBuyer, Timeout → no fees). The chip copy comes from
 * `data/outcomes.ts` which is the single source of truth the unit
 * tests guard against Solidity drift.
 */

import { useId } from 'react';
import { HIW_OUTCOMES } from '../data/outcomes';
import { useHiw } from '../context/HiwContext';
import styles from './Safeguards.module.scss';

export function SafeguardsPanel() {
  const { outcome, setOutcome } = useHiw();
  const baseId = useId();

  return (
    <section
      className={styles.safeguards}
      aria-labelledby={`${baseId}-heading`}
    >
      <header className={styles.safeguards__head}>
        <div className={styles.safeguards__eyebrow}>Safeguards</div>
        <h3 id={`${baseId}-heading`} className={styles.safeguards__heading}>
          What if it <em>goes wrong?</em>
        </h3>
        <p className={styles.safeguards__subtitle}>
          The happy path above is one of five on-chain resolutions. Pick a
          branch to see how the contract handles each one — without the
          middleman ever touching a dollar.
        </p>
      </header>

      <div
        className={styles.safeguards__tabs}
        role="tablist"
        aria-label="Safeguard outcomes"
      >
        {HIW_OUTCOMES.map((o) => {
          const isActive = outcome === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${o.id}`}
              aria-controls={`${baseId}-panel-${o.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              data-hiw-outcome-chip={o.id}
              className={`${styles.safeguards__tab} ${
                isActive ? styles['safeguards__tab--active'] : ''
              }`}
              onClick={() => setOutcome(isActive ? null : o.id)}
            >
              <span className={styles.safeguards__tabLabel}>{o.chipLabel}</span>
              <span
                className={`${styles.safeguards__tabFee} ${
                  o.feeApplies
                    ? styles['safeguards__tabFee--paid']
                    : styles['safeguards__tabFee--free']
                }`}
                aria-hidden="true"
              >
                {o.feeApplies ? 'Fees apply' : 'Fee-free'}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.safeguards__panels}>
        {HIW_OUTCOMES.map((o) => {
          const isActive = outcome === o.id;
          return (
            <section
              key={o.id}
              role="tabpanel"
              id={`${baseId}-panel-${o.id}`}
              aria-labelledby={`${baseId}-tab-${o.id}`}
              hidden={!isActive}
              className={styles.safeguards__panel}
              data-hiw-outcome-panel={o.id}
            >
              <h4 className={styles.safeguards__panelTitle}>{o.narrTitle}</h4>
              <p className={styles.safeguards__panelBody}>{o.narrBody}</p>
              <p
                className={`${styles.safeguards__feeNote} ${
                  o.feeApplies
                    ? styles['safeguards__feeNote--paid']
                    : styles['safeguards__feeNote--free']
                }`}
              >
                <span aria-hidden="true" className={styles.safeguards__feeDot} />
                {o.feeNote}
              </p>
            </section>
          );
        })}
      </div>

      {outcome === null ? (
        <p className={styles.safeguards__hint} aria-live="polite">
          Pick a branch above to preview its on-chain resolution.
        </p>
      ) : null}
    </section>
  );
}
