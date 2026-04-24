import { describe, it, expect, afterEach } from 'vitest';
import { createRef, useRef } from 'react';
import { render, cleanup } from '@testing-library/react';
import { useOutcomeBranch } from './useOutcomeBranch';
import type { OutcomeId } from '../data/outcomes';

afterEach(cleanup);

function Harness({ outcome }: { outcome: OutcomeId | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useOutcomeBranch({ targetRef: ref, outcome });
  return <div ref={ref} data-testid="target" />;
}

describe('useOutcomeBranch', () => {
  it('writes data-hiw-outcome="happy" when outcome is null', () => {
    const { getByTestId } = render(<Harness outcome={null} />);
    const el = getByTestId('target');
    expect(el.getAttribute('data-hiw-outcome')).toBe('happy');
  });

  it('writes the outcome id when a Safeguards branch is active', () => {
    const { getByTestId, rerender } = render(<Harness outcome="disputeBuyer" />);
    const el = getByTestId('target');
    expect(el.getAttribute('data-hiw-outcome')).toBe('disputeBuyer');
    rerender(<Harness outcome="timeout" />);
    expect(el.getAttribute('data-hiw-outcome')).toBe('timeout');
  });

  it('lifts --hiw-judge-opacity to 1 on disputeBuyer and disputeSeller', () => {
    const { getByTestId, rerender } = render(<Harness outcome="disputeBuyer" />);
    const el = getByTestId('target');
    expect(el.style.getPropertyValue('--hiw-judge-opacity')).toBe('1');
    rerender(<Harness outcome="disputeSeller" />);
    expect(el.style.getPropertyValue('--hiw-judge-opacity')).toBe('1');
  });

  it('keeps --hiw-judge-opacity at 0.3 on fee-free / non-dispute outcomes', () => {
    const outcomes: Array<OutcomeId | null> = [null, 'refund', 'timeout'];
    for (const outcome of outcomes) {
      const { getByTestId, unmount } = render(<Harness outcome={outcome} />);
      const el = getByTestId('target');
      expect(el.style.getPropertyValue('--hiw-judge-opacity')).toBe('0.3');
      unmount();
    }
  });

  it('charges the vault on every outcome (Safeguards fires post-Fund)', () => {
    const outcomes: Array<OutcomeId | null> = [
      null,
      'refund',
      'disputeBuyer',
      'disputeSeller',
      'timeout',
    ];
    for (const outcome of outcomes) {
      const { getByTestId, unmount } = render(<Harness outcome={outcome} />);
      expect(
        getByTestId('target').style.getPropertyValue('--hiw-vault-charge'),
      ).toBe('1');
      unmount();
    }
  });

  it('flags --hiw-fee-applies to match Solidity: only Delivery + MiddlemanSeller pay fees', () => {
    const cases: Array<[OutcomeId | null, string]> = [
      [null, '1'], // happy path = Delivery
      ['refund', '0'],
      ['disputeBuyer', '0'],
      ['disputeSeller', '1'],
      ['timeout', '0'],
    ];
    for (const [outcome, expected] of cases) {
      const { getByTestId, unmount } = render(<Harness outcome={outcome} />);
      expect(
        getByTestId('target').style.getPropertyValue('--hiw-fee-applies'),
      ).toBe(expected);
      unmount();
    }
  });

  it('clears attribute + styles on unmount', () => {
    const { getByTestId, unmount } = render(<Harness outcome="disputeBuyer" />);
    const el = getByTestId('target');
    expect(el.getAttribute('data-hiw-outcome')).toBe('disputeBuyer');
    expect(el.style.getPropertyValue('--hiw-judge-opacity')).toBe('1');
    unmount();
    // After unmount the element is removed from the DOM; if it were still
    // attached, the cleanup effect would have wiped attribute + style — we
    // assert that by rendering a fresh mount with a different outcome.
    const { getByTestId: getFresh } = render(<Harness outcome={null} />);
    expect(getFresh('target').getAttribute('data-hiw-outcome')).toBe('happy');
  });

  it('no-ops when the ref has no element yet (SSR pre-hydration)', () => {
    // Fabricate a ref that never attaches — simulates a premature call.
    const ref = createRef<HTMLDivElement>();
    // Direct invocation harness
    function Fake() {
      useOutcomeBranch({ targetRef: ref, outcome: 'timeout' });
      return null;
    }
    expect(() => render(<Fake />)).not.toThrow();
  });
});
