// ---------------------------------------------------------------------------
// HowItWorks integration — ties the v8 Safeguards redesign together.
//
// The unit tests in Safeguards/, svg/, animations/, and context/ each cover
// their own surface in isolation. This spec exercises the full chain so any
// broken wire between:
//
//   click(tab) → HiwContext.setOutcome(id)
//              → Safeguards hidden attribute swap
//              → useOutcomeBranch → data-hiw-outcome + CSS custom props on
//                the HowItWorks <section>
//              → announceOutcome → live region text
//
// lights up as a real regression, not a silent drift between layers.
// Mocks HowItWorksAnimations and HiwPhaseDiagram (they own GSAP + heavy
// SVG) so the integration test stays vitest-fast.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';

vi.mock('./HowItWorksAnimations', () => ({
  HowItWorksAnimations: ({
    children,
  }: {
    children: React.ReactNode;
    stageRef: unknown;
    onPhaseChange: (p: 0 | 1 | 2 | 3 | 4) => void;
  }) => <div>{children}</div>,
}));

vi.mock('./HiwPhaseDiagram', () => ({
  HiwPhaseDiagram: () => null,
}));

vi.mock('@/providers/LenisProvider', () => ({
  useLenisInstance: () => ({ scrollTo: vi.fn() }),
}));

import { HowItWorks } from './HowItWorks';

afterEach(cleanup);

type OutcomeCase = {
  id: 'refund' | 'disputeBuyer' | 'disputeSeller' | 'timeout';
  judgeOpacity: '0.3' | '1';
  feeApplies: '0' | '1';
  soulboundMint: '0' | '1';
  announcement: RegExp;
};

const CASES: OutcomeCase[] = [
  {
    id: 'refund',
    judgeOpacity: '0.3',
    feeApplies: '0',
    soulboundMint: '1', // _resolveDeal always mints soulbound (Escrow.sol:601)
    announcement: /Refund outcome selected/i,
  },
  {
    id: 'disputeBuyer',
    judgeOpacity: '1',
    feeApplies: '0',
    soulboundMint: '1',
    announcement: /Dispute.*Buyer/i,
  },
  {
    id: 'disputeSeller',
    judgeOpacity: '1',
    feeApplies: '1',
    soulboundMint: '1',
    announcement: /Dispute.*Seller/i,
  },
  {
    id: 'timeout',
    judgeOpacity: '0.3',
    feeApplies: '0',
    soulboundMint: '1',
    announcement: /Timeout outcome selected/i,
  },
];

describe('HowItWorks integration · Safeguards → section state chain', () => {
  it('starts on happy path (data-hiw-outcome="happy", all chips aria-selected=false)', () => {
    const { container } = render(<HowItWorks />);
    const section = container.querySelector('section#hiw')!;
    expect(section.getAttribute('data-hiw-outcome')).toBe('happy');
    for (const chip of container.querySelectorAll('[data-hiw-outcome-chip]')) {
      expect(chip.getAttribute('aria-selected')).toBe('false');
    }
  });

  it.each(CASES)(
    'clicking the $id chip propagates to data-hiw-outcome + CSS vars + live announcer',
    ({ id, judgeOpacity, feeApplies, soulboundMint, announcement }) => {
      const { container } = render(<HowItWorks />);
      const section = container.querySelector<HTMLElement>('section#hiw')!;
      const chip = container.querySelector<HTMLButtonElement>(
        `[data-hiw-outcome-chip="${id}"]`,
      )!;

      fireEvent.click(chip);

      // (a) context-owned state
      expect(chip.getAttribute('aria-selected')).toBe('true');

      // (b) useOutcomeBranch wrote the section attribute + CSS vars
      expect(section.getAttribute('data-hiw-outcome')).toBe(id);
      expect(section.style.getPropertyValue('--hiw-judge-opacity')).toBe(
        judgeOpacity,
      );
      expect(section.style.getPropertyValue('--hiw-fee-applies')).toBe(
        feeApplies,
      );
      expect(section.style.getPropertyValue('--hiw-outcome-active')).toBe('1');
      expect(section.style.getPropertyValue('--hiw-soulbound-mint')).toBe(
        soulboundMint,
      );

      // (c) matching panel revealed, others hidden
      const panels = container.querySelectorAll('[data-hiw-outcome-panel]');
      for (const panel of panels) {
        const panelId = panel.getAttribute('data-hiw-outcome-panel');
        if (panelId === id) {
          expect(panel.hasAttribute('hidden')).toBe(false);
        } else {
          expect(panel.hasAttribute('hidden')).toBe(true);
        }
      }

      // (d) announcer text reflects the outcome
      const live = container.querySelector('[data-hiw-outcome-announcer]')!;
      expect(live.textContent ?? '').toMatch(announcement);
    },
  );

  it('re-clicking the active chip resets the whole chain to happy path', () => {
    const { container } = render(<HowItWorks />);
    const section = container.querySelector<HTMLElement>('section#hiw')!;
    const chip = container.querySelector<HTMLButtonElement>(
      '[data-hiw-outcome-chip="disputeSeller"]',
    )!;

    fireEvent.click(chip); // enter dispute-seller
    expect(section.getAttribute('data-hiw-outcome')).toBe('disputeSeller');

    fireEvent.click(chip); // toggle back to happy
    expect(section.getAttribute('data-hiw-outcome')).toBe('happy');
    expect(section.style.getPropertyValue('--hiw-outcome-active')).toBe('0');
    expect(section.style.getPropertyValue('--hiw-judge-opacity')).toBe('0.3');
    // All panels hidden again
    for (const panel of container.querySelectorAll('[data-hiw-outcome-panel]')) {
      expect(panel.hasAttribute('hidden')).toBe(true);
    }
  });

  it('fee-applies flag stays aligned with the Solidity rule across every outcome', () => {
    // This is the same invariant the data/contract-map.test covers at the
    // data layer; here we prove the integration preserves it end-to-end.
    const { container } = render(<HowItWorks />);
    const section = container.querySelector<HTMLElement>('section#hiw')!;

    const expectations: Array<[string, '0' | '1']> = [
      ['refund', '0'],
      ['disputeBuyer', '0'],
      ['disputeSeller', '1'],
      ['timeout', '0'],
    ];
    for (const [id, fee] of expectations) {
      const chip = container.querySelector<HTMLButtonElement>(
        `[data-hiw-outcome-chip="${id}"]`,
      )!;
      fireEvent.click(chip);
      expect(section.style.getPropertyValue('--hiw-fee-applies')).toBe(fee);
      // Toggle back so the next outcome starts from happy path
      fireEvent.click(chip);
    }
  });
});
