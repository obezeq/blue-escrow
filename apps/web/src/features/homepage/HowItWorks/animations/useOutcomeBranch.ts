'use client';

/**
 * useOutcomeBranch — outcome-reactive CSS bridge.
 *
 * Listens to `HiwContext.outcome` and, when the user picks a Safeguards
 * tab, writes a single `data-hiw-outcome` attribute + a handful of CSS
 * custom properties on a target element (the HowItWorks <section>).
 * Styles in the SVG module (hiw-svg.module.scss) and the main module
 * (HowItWorks.module.scss) drive the visual response off those
 * properties, so the branch effect lands without touching the existing
 * 879-line master timeline.
 *
 * CSS vars written:
 *   --hiw-judge-opacity   · 1 on dispute outcomes (middleman activates),
 *                           0.3 otherwise (happy-path standby)
 *   --hiw-vault-charge    · 0 pre-Fund / refund / timeout,
 *                           1 post-Fund / Settle paths (kept at 0 for
 *                           now — commit 9-11 ramps it per branch)
 *
 * Future commits (dispute/timeout/refund timelines) can extend the
 * `outcomeVars` map without touching any consumer.
 *
 * The hook is a strict function-of-state: no refs, no timers, safe to
 * re-run on every context transition. Reduced-motion users get the same
 * final values — the CSS layer handles instant vs transitioned paint.
 */

import { useEffect, type RefObject } from 'react';
import type { OutcomeId } from '../data/outcomes';

export type OutcomeKey = OutcomeId | 'happy';

interface OutcomeVars {
  '--hiw-judge-opacity'?: number;
  '--hiw-vault-charge'?: number;
  /** Numeric flag consumed by CSS: 1 if fees are deducted, 0 if fee-free. */
  '--hiw-fee-applies'?: number;
}

/**
 * The reactive driver for all five surface states. Every outcome
 * preserves the vault as charged (--hiw-vault-charge: 1) because funding
 * has already happened by the time Safeguards fires — the branch story
 * is about how the vault pays OUT, not whether it was filled.
 *
 * --hiw-fee-applies is boolean-as-number so the CSS layer can gate
 * fee-split visuals (buckets + spouts) without re-deriving the
 * resolutionAppliesFees rule, and so forced-colors falls back cleanly.
 */
const OUTCOME_VARS: Record<OutcomeKey, OutcomeVars> = {
  happy: {
    '--hiw-judge-opacity': 0.3,
    '--hiw-vault-charge': 1,
    '--hiw-fee-applies': 1, // Delivery → fees apply
  },
  refund: {
    '--hiw-judge-opacity': 0.3,
    '--hiw-vault-charge': 1,
    '--hiw-fee-applies': 0, // no fees — seller volunteered refund
  },
  disputeBuyer: {
    '--hiw-judge-opacity': 1,
    '--hiw-vault-charge': 1,
    '--hiw-fee-applies': 0, // buyer protection — no fees
  },
  disputeSeller: {
    '--hiw-judge-opacity': 1,
    '--hiw-vault-charge': 1,
    '--hiw-fee-applies': 1, // same split as delivery
  },
  timeout: {
    '--hiw-judge-opacity': 0.3,
    '--hiw-vault-charge': 1,
    '--hiw-fee-applies': 0, // permissionless rescue — no fees
  },
};

const TRACKED_VARS = [
  '--hiw-judge-opacity',
  '--hiw-vault-charge',
  '--hiw-fee-applies',
] as const;

export interface UseOutcomeBranchParams {
  targetRef: RefObject<HTMLElement | null>;
  outcome: OutcomeId | null;
}

export function useOutcomeBranch({ targetRef, outcome }: UseOutcomeBranchParams) {
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const key: OutcomeKey = outcome ?? 'happy';
    target.setAttribute('data-hiw-outcome', key);

    const vars = OUTCOME_VARS[key] ?? {};
    for (const name of TRACKED_VARS) {
      const value = vars[name];
      if (value === undefined) {
        target.style.removeProperty(name);
      } else {
        target.style.setProperty(name, String(value));
      }
    }

    return () => {
      target.removeAttribute('data-hiw-outcome');
      for (const name of TRACKED_VARS) {
        target.style.removeProperty(name);
      }
    };
  }, [targetRef, outcome]);
}
