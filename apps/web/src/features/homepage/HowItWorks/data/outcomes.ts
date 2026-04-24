import { DealState, ResolutionType } from './contract-map';

/**
 * The four "Safeguards" outcomes surfaced beneath the pinned happy-path
 * timeline. Each tab swaps the scene in-place, replaying the vault →
 * recipient flow for that specific `ResolutionType`. Delivery (the happy
 * path) is NOT in this list — it's the default timeline.
 */
export type OutcomeId = 'refund' | 'disputeBuyer' | 'disputeSeller' | 'timeout';

export interface HiwOutcome {
  id: OutcomeId;
  chipLabel: string;
  narrTitle: string;
  narrBody: string;
  finalState: DealState;
  resolution: ResolutionType;
  feeApplies: boolean;
  feeNote: string;
  /**
   * Which party ends up with the escrowed funds in `_pendingBalances`
   * (the seller-win flag controls the 3-bucket split visual).
   */
  winner: 'client' | 'seller';
}

export const HIW_OUTCOMES: readonly HiwOutcome[] = [
  {
    id: 'refund',
    chipLabel: 'Refund',
    narrTitle: 'Seller accepts the refund.',
    narrBody:
      'Client requests a refund, seller agrees. Full amount credited back to the client — no middleman, no fees.',
    finalState: DealState.Resolved,
    resolution: ResolutionType.Refund,
    feeApplies: false,
    feeNote: 'No fees · nothing moved finally',
    winner: 'client',
  },
  {
    id: 'disputeBuyer',
    chipLabel: 'Dispute → Buyer',
    narrTitle: 'Middleman rules for the buyer.',
    narrBody:
      'Client requests refund, seller rejects, middleman arbitrates — and sides with the client. Full amount returns to the client. The middleman earns a soulbound NFT, not money.',
    finalState: DealState.Resolved,
    resolution: ResolutionType.MiddlemanBuyer,
    feeApplies: false,
    feeNote: 'No fees · buyer protection',
    winner: 'client',
  },
  {
    id: 'disputeSeller',
    chipLabel: 'Dispute → Seller',
    narrTitle: 'Middleman rules for the seller.',
    narrBody:
      'Same dispute, opposite verdict. Seller payout, middleman commission, platform fee — same split as a clean delivery.',
    finalState: DealState.Resolved,
    resolution: ResolutionType.MiddlemanSeller,
    feeApplies: true,
    feeNote: 'Fees apply · same as delivery',
    winner: 'seller',
  },
  {
    id: 'timeout',
    chipLabel: 'Timeout',
    narrTitle: 'Deadline passes. Anyone rescues the client.',
    narrBody:
      'If nobody moves before the deadline, anyone on-chain can call `executeTimeout` and the vault refunds the client. Permissionless, always free.',
    finalState: DealState.TimedOut,
    resolution: ResolutionType.Timeout,
    feeApplies: false,
    feeNote: 'No fees · permissionless rescue',
    winner: 'client',
  },
] as const;

export function getOutcome(id: OutcomeId): HiwOutcome {
  const match = HIW_OUTCOMES.find((o) => o.id === id);
  if (!match) throw new Error(`Unknown HIW outcome: ${id}`);
  return match;
}
