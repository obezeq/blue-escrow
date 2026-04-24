import { describe, it, expect } from 'vitest';
import {
  DealState,
  ResolutionType,
  ParticipantRole,
  DEAL_STATE_LABEL,
  RESOLUTION_LABEL,
  resolutionAppliesFees,
  resolutionMintsSoulbound,
} from './contract-map';

describe('DealState enum parity with Solidity', () => {
  it('matches the 9 variants declared in apps/contracts/src/types/DataTypes.sol', () => {
    expect(DealState.Created).toBe(0);
    expect(DealState.Joined).toBe(1);
    expect(DealState.Signed).toBe(2);
    expect(DealState.Funded).toBe(3);
    expect(DealState.DeliveryConfirmed).toBe(4);
    expect(DealState.RefundRequested).toBe(5);
    expect(DealState.Disputed).toBe(6);
    expect(DealState.Resolved).toBe(7);
    expect(DealState.TimedOut).toBe(8);
  });

  it('has a human label for every variant', () => {
    for (let i = 0; i <= 8; i += 1) {
      expect(DEAL_STATE_LABEL[i as DealState]).toBeTruthy();
    }
  });
});

describe('ResolutionType enum parity with Solidity', () => {
  it('has None as the zero value (unresolved default)', () => {
    expect(ResolutionType.None).toBe(0);
  });

  it('matches the 6 variants declared in Solidity', () => {
    expect(ResolutionType.None).toBe(0);
    expect(ResolutionType.Delivery).toBe(1);
    expect(ResolutionType.Refund).toBe(2);
    expect(ResolutionType.MiddlemanBuyer).toBe(3);
    expect(ResolutionType.MiddlemanSeller).toBe(4);
    expect(ResolutionType.Timeout).toBe(5);
  });

  it('has a human label for every variant', () => {
    for (let i = 0; i <= 5; i += 1) {
      expect(RESOLUTION_LABEL[i as ResolutionType]).toBeTruthy();
    }
  });
});

describe('ParticipantRole enum parity', () => {
  it('matches the 3 variants declared in Solidity', () => {
    expect(ParticipantRole.Client).toBe(0);
    expect(ParticipantRole.Seller).toBe(1);
    expect(ParticipantRole.Middleman).toBe(2);
  });
});

describe('resolutionAppliesFees — matches Escrow.sol:576-586', () => {
  it('returns true ONLY for seller-win outcomes', () => {
    expect(resolutionAppliesFees(ResolutionType.Delivery)).toBe(true);
    expect(resolutionAppliesFees(ResolutionType.MiddlemanSeller)).toBe(true);
  });

  it('returns false for every client-win outcome', () => {
    expect(resolutionAppliesFees(ResolutionType.Refund)).toBe(false);
    expect(resolutionAppliesFees(ResolutionType.MiddlemanBuyer)).toBe(false);
    expect(resolutionAppliesFees(ResolutionType.Timeout)).toBe(false);
  });

  it('returns false for the unresolved default', () => {
    expect(resolutionAppliesFees(ResolutionType.None)).toBe(false);
  });
});

describe('resolutionMintsSoulbound — matches Escrow.sol dispute-only mint logic', () => {
  it('mints soulbound only for middleman-arbitrated outcomes', () => {
    expect(resolutionMintsSoulbound(ResolutionType.MiddlemanBuyer)).toBe(true);
    expect(resolutionMintsSoulbound(ResolutionType.MiddlemanSeller)).toBe(true);
  });

  it('does not mint soulbound on happy path or auto-resolution', () => {
    expect(resolutionMintsSoulbound(ResolutionType.Delivery)).toBe(false);
    expect(resolutionMintsSoulbound(ResolutionType.Refund)).toBe(false);
    expect(resolutionMintsSoulbound(ResolutionType.Timeout)).toBe(false);
    expect(resolutionMintsSoulbound(ResolutionType.None)).toBe(false);
  });
});
