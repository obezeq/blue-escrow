/**
 * Contract-accurate enums ported from
 * `apps/contracts/src/types/DataTypes.sol`. These drive the UI ledger
 * chips, event-log labels, and outcome branch dispatch so the homepage
 * narrative stays 1:1 with the on-chain state machine.
 *
 * Zero-indexed to match Solidity enum ordering — any drift from the
 * Solidity source is a bug (see data/contract-map.test.ts).
 */

export enum DealState {
  Created = 0,
  Joined = 1,
  Signed = 2,
  Funded = 3,
  DeliveryConfirmed = 4,
  RefundRequested = 5,
  Disputed = 6,
  Resolved = 7,
  TimedOut = 8,
}

export enum ResolutionType {
  None = 0,
  Delivery = 1,
  Refund = 2,
  MiddlemanBuyer = 3,
  MiddlemanSeller = 4,
  Timeout = 5,
}

export enum ParticipantRole {
  Client = 0,
  Seller = 1,
  Middleman = 2,
}

export const DEAL_STATE_LABEL: Record<DealState, string> = {
  [DealState.Created]: 'Created',
  [DealState.Joined]: 'Joined',
  [DealState.Signed]: 'Signed',
  [DealState.Funded]: 'Funded',
  [DealState.DeliveryConfirmed]: 'Delivery Confirmed',
  [DealState.RefundRequested]: 'Refund Requested',
  [DealState.Disputed]: 'Disputed',
  [DealState.Resolved]: 'Resolved',
  [DealState.TimedOut]: 'Timed Out',
};

export const RESOLUTION_LABEL: Record<ResolutionType, string> = {
  [ResolutionType.None]: 'Unresolved',
  [ResolutionType.Delivery]: 'Delivery',
  [ResolutionType.Refund]: 'Refund',
  [ResolutionType.MiddlemanBuyer]: 'Middleman · Buyer',
  [ResolutionType.MiddlemanSeller]: 'Middleman · Seller',
  [ResolutionType.Timeout]: 'Timeout',
};

/**
 * Fees are deducted ONLY when the seller wins (Escrow.sol:576-586).
 * Client-win resolutions (Refund, MiddlemanBuyer, Timeout) credit the
 * full amount to the client with zero fees.
 */
export function resolutionAppliesFees(resolution: ResolutionType): boolean {
  return (
    resolution === ResolutionType.Delivery ||
    resolution === ResolutionType.MiddlemanSeller
  );
}

/**
 * Every resolution mints one ReceiptNFT for the client + one for the
 * seller. SoulboundNFT only mints when the middleman actually ruled
 * (dispute outcomes) — not on happy-path delivery, mutual refund, or
 * permissionless timeout.
 */
export function resolutionMintsSoulbound(resolution: ResolutionType): boolean {
  return (
    resolution === ResolutionType.MiddlemanBuyer ||
    resolution === ResolutionType.MiddlemanSeller
  );
}
