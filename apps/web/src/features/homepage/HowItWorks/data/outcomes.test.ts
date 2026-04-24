import { describe, it, expect } from 'vitest';
import { HIW_OUTCOMES, getOutcome } from './outcomes';
import { DealState, ResolutionType, resolutionAppliesFees } from './contract-map';

describe('HIW_OUTCOMES', () => {
  it('exposes exactly the four safeguard scenarios', () => {
    const ids = HIW_OUTCOMES.map((o) => o.id).sort();
    expect(ids).toEqual(['disputeBuyer', 'disputeSeller', 'refund', 'timeout']);
  });

  it('never includes the happy-path Delivery resolution (that is the default timeline)', () => {
    const resolutions = HIW_OUTCOMES.map((o) => o.resolution);
    expect(resolutions).not.toContain(ResolutionType.Delivery);
  });

  it('keeps feeApplies aligned with the on-chain fee rule', () => {
    for (const outcome of HIW_OUTCOMES) {
      expect(outcome.feeApplies).toBe(resolutionAppliesFees(outcome.resolution));
    }
  });

  it('maps winners to the correct side for each resolution', () => {
    expect(getOutcome('refund').winner).toBe('client');
    expect(getOutcome('disputeBuyer').winner).toBe('client');
    expect(getOutcome('disputeSeller').winner).toBe('seller');
    expect(getOutcome('timeout').winner).toBe('client');
  });

  it('uses DealState.TimedOut for the timeout branch (other branches land on Resolved)', () => {
    expect(getOutcome('timeout').finalState).toBe(DealState.TimedOut);
    expect(getOutcome('refund').finalState).toBe(DealState.Resolved);
    expect(getOutcome('disputeBuyer').finalState).toBe(DealState.Resolved);
    expect(getOutcome('disputeSeller').finalState).toBe(DealState.Resolved);
  });

  it('includes a fee note for every outcome', () => {
    for (const outcome of HIW_OUTCOMES) {
      expect(outcome.feeNote.length).toBeGreaterThan(0);
    }
  });
});

describe('getOutcome', () => {
  it('returns the matching outcome by id', () => {
    expect(getOutcome('refund').resolution).toBe(ResolutionType.Refund);
  });

  it('throws for an unknown id', () => {
    // @ts-expect-error — deliberately passing a bad id
    expect(() => getOutcome('nope')).toThrow();
  });
});
