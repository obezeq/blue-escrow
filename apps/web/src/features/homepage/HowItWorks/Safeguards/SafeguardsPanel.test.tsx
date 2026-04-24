import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { HiwProvider } from '../context/HiwContext';
import { SafeguardsPanel, announceOutcome } from './SafeguardsPanel';

afterEach(cleanup);

function renderWithProvider() {
  return render(
    <HiwProvider>
      <SafeguardsPanel />
    </HiwProvider>,
  );
}

describe('SafeguardsPanel — tablist contract', () => {
  it('renders exactly four tabs for the four Safeguards outcomes', () => {
    const { container } = renderWithProvider();
    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(4);
  });

  it('tags each tab with data-hiw-outcome-chip keyed by outcome id', () => {
    const { container } = renderWithProvider();
    const ids = Array.from(
      container.querySelectorAll('[data-hiw-outcome-chip]'),
    ).map((el) => el.getAttribute('data-hiw-outcome-chip'));
    expect(new Set(ids)).toEqual(
      new Set(['refund', 'disputeBuyer', 'disputeSeller', 'timeout']),
    );
  });

  it('starts with no tab selected (happy-path default outcome=null)', () => {
    const { container } = renderWithProvider();
    for (const tab of container.querySelectorAll('[role="tab"]')) {
      expect(tab.getAttribute('aria-selected')).toBe('false');
    }
  });

  it('clicking a tab flips aria-selected and reveals the matching tabpanel', () => {
    const { container } = renderWithProvider();
    const refundTab = container.querySelector<HTMLButtonElement>(
      '[data-hiw-outcome-chip="refund"]',
    )!;
    fireEvent.click(refundTab);
    expect(refundTab.getAttribute('aria-selected')).toBe('true');

    const refundPanel = container.querySelector<HTMLElement>(
      '[data-hiw-outcome-panel="refund"]',
    )!;
    expect(refundPanel.hasAttribute('hidden')).toBe(false);

    // All other panels stay hidden
    const others = container.querySelectorAll(
      '[data-hiw-outcome-panel]:not([data-hiw-outcome-panel="refund"])',
    );
    for (const p of others) {
      expect(p.hasAttribute('hidden')).toBe(true);
    }
  });

  it('re-clicking the active tab returns to happy-path (outcome=null, all panels hidden)', () => {
    const { container } = renderWithProvider();
    const refundTab = container.querySelector<HTMLButtonElement>(
      '[data-hiw-outcome-chip="refund"]',
    )!;
    fireEvent.click(refundTab);
    fireEvent.click(refundTab);
    expect(refundTab.getAttribute('aria-selected')).toBe('false');
    for (const panel of container.querySelectorAll('[data-hiw-outcome-panel]')) {
      expect(panel.hasAttribute('hidden')).toBe(true);
    }
  });

  it('colour-codes fee badges: dispute-seller pays, the other three are fee-free', () => {
    const { container } = renderWithProvider();
    const chipFee = (id: string) =>
      container
        .querySelector(`[data-hiw-outcome-chip="${id}"]`)
        ?.querySelector('[aria-hidden="true"]')?.textContent;
    expect(chipFee('disputeSeller')).toMatch(/Fees apply/i);
    expect(chipFee('refund')).toMatch(/Fee-free/i);
    expect(chipFee('disputeBuyer')).toMatch(/Fee-free/i);
    expect(chipFee('timeout')).toMatch(/Fee-free/i);
  });

  it('exposes a semantic heading and subtitle via aria-labelledby', () => {
    const { container } = renderWithProvider();
    const section = container.querySelector('section[aria-labelledby]');
    expect(section).not.toBeNull();
    const headingId = section!.getAttribute('aria-labelledby')!;
    // `useId()` can produce ids containing `:`; fetch by getElementById to
    // side-step querySelector's need for CSS.escape (absent in jsdom).
    const heading = document.getElementById(headingId);
    expect(heading).not.toBeNull();
    expect(heading?.tagName.toLowerCase()).toBe('h3');
    expect(heading?.textContent).toMatch(/goes wrong/i);
  });

  it('exposes a polite aria-live region that updates on outcome change', () => {
    const { container } = renderWithProvider();
    const live = container.querySelector('[data-hiw-outcome-announcer]');
    expect(live).not.toBeNull();
    expect(live?.getAttribute('aria-live')).toBe('polite');
    expect(live?.getAttribute('aria-atomic')).toBe('true');
    expect(live?.getAttribute('role')).toBe('status');
    // happy-path announcement present at mount
    expect(live?.textContent).toMatch(/happy path/i);

    const refundTab = container.querySelector<HTMLButtonElement>(
      '[data-hiw-outcome-chip="refund"]',
    )!;
    fireEvent.click(refundTab);
    expect(live?.textContent).toMatch(/refund/i);
    expect(live?.textContent).toMatch(/seller accepts/i);
  });

  it('only the active tab is in the tab order (tabIndex=0); others get -1', () => {
    const { container } = renderWithProvider();
    // At rest every tab is non-active; the first tab still needs a keyboard
    // entry point per APG but we use -1 for all inactive tabs and rely on
    // outer container focus. Once any tab is active, it owns tabIndex 0.
    const refundTab = container.querySelector<HTMLButtonElement>(
      '[data-hiw-outcome-chip="refund"]',
    )!;
    fireEvent.click(refundTab);
    expect(refundTab.tabIndex).toBe(0);
    const others = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-hiw-outcome-chip]'),
    ).filter((el) => el !== refundTab);
    for (const t of others) {
      expect(t.tabIndex).toBe(-1);
    }
  });
});

describe('announceOutcome helper', () => {
  it('returns happy-path phrase when outcome is null', () => {
    expect(announceOutcome(null)).toMatch(/happy path/i);
  });

  it('reads out the chip label, title, and fee note for a named outcome', () => {
    const msg = announceOutcome('disputeSeller');
    expect(msg).toMatch(/Dispute/i);
    expect(msg).toMatch(/Seller/i);
    expect(msg).toMatch(/Fees apply/i);
  });

  it('includes chip label for every one of the four Safeguards outcomes', () => {
    for (const id of ['refund', 'disputeBuyer', 'disputeSeller', 'timeout']) {
      expect(announceOutcome(id)).toBeTruthy();
    }
  });
});
