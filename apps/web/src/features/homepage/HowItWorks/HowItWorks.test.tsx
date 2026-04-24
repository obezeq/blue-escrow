// ---------------------------------------------------------------------------
// HowItWorks.test.tsx — v7 structural + interaction contract.
//
// v7 introduces a mobile step-deck (`.hiw__deck` → 5 `.hiw__phaseCard`) that
// is ALWAYS in the DOM and gets toggled via CSS at @media (max-width:899px).
// This means state-chip labels, step counters, and narration titles appear
// multiple times in the rendered output — once in the desktop stage and once
// per mobile card. All query helpers in this file are careful to scope by
// container / data-attribute / aria-label to avoid ambiguity.
// ---------------------------------------------------------------------------
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';

vi.mock('./HowItWorksAnimations', () => ({
  HowItWorksAnimations: ({
    children,
  }: {
    children: React.ReactNode;
    stageRef: unknown;
    onPhaseChange: (p: 0 | 1 | 2 | 3 | 4) => void;
  }) => <div>{children}</div>,
}));

import { HowItWorks } from './HowItWorks';
import { HIW_STEPS } from './data';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Helpers — always query with container scoping because the mobile deck
// duplicates chip/narration text across 5 cards.
// ---------------------------------------------------------------------------
const narrTitleEl = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-animate="narr-title"]');
const narrBodyEl = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-animate="narr-body"]');
const ledgerAmountEl = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-hiw-ledger="amount"]');
const stateChipEl = (container: HTMLElement) =>
  // There's only ONE [aria-live="polite"] node (the desktop state chip);
  // the dd.hiw__state inside each mobile card does NOT carry aria-live.
  container.querySelector<HTMLElement>('[aria-live="polite"]');
const railButtons = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('[data-hiw-rail]'));
const deckEl = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.hiw__deck');
const phaseCards = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-hiw-phase-card]'));
const phaseNav = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(
    'nav[aria-label="Phase navigation"]',
  );

// ---------------------------------------------------------------------------
describe('HowItWorks — v7 structural contract', () => {
  it('renders a single <section id="hiw"> landmark with aria-label', () => {
    const { container } = render(<HowItWorks />);
    const sections = container.querySelectorAll('section#hiw');
    expect(sections.length).toBe(1);
    expect(sections[0]!.getAttribute('aria-label')).toBe(
      'How it works in five steps',
    );
  });

  it('exposes exactly one <h2> with an emphasis <em>', () => {
    render(<HowItWorks />);
    const h2s = screen.getAllByRole('heading', { level: 2 });
    expect(h2s.length).toBe(1);
    const em = h2s[0]!.querySelector('em');
    expect(em).not.toBeNull();
    expect(em!.textContent).toBe('smart contract.');
  });

  it('renders the eyebrow "How it works" with data-animate="eyebrow"', () => {
    const { container } = render(<HowItWorks />);
    const eyebrow = container.querySelector('[data-animate="eyebrow"]');
    expect(eyebrow).not.toBeNull();
    expect(eyebrow!.textContent).toBe('How it works');
  });

  it('renders the v7 SVG (viewBox "0 0 1200 720") with 3 actor groups, packet, wire-active C/M/S', () => {
    const { container } = render(<HowItWorks />);
    const svg = container.querySelector('svg[viewBox="0 0 1200 720"]');
    expect(svg).not.toBeNull();
    expect(svg!.querySelector('[data-hiw="actor-client"]')).not.toBeNull();
    expect(svg!.querySelector('[data-hiw="actor-mid"]')).not.toBeNull();
    expect(svg!.querySelector('[data-hiw="actor-seller"]')).not.toBeNull();
    expect(svg!.querySelector('[data-hiw="packet"]')).not.toBeNull();
    expect(svg!.querySelector('[data-hiw="wire-active-C"]')).not.toBeNull();
    expect(svg!.querySelector('[data-hiw="wire-active-M"]')).not.toBeNull();
    expect(svg!.querySelector('[data-hiw="wire-active-S"]')).not.toBeNull();
  });

  it('tags the desktop ledger amount via data-hiw-ledger="amount"', () => {
    const { container } = render(<HowItWorks />);
    const all = container.querySelectorAll('[data-hiw-ledger="amount"]');
    // Only the desktop ledger carries this attribute — mobile cards render
    // amount as a <dd> with no data-hiw-ledger marker.
    expect(all.length).toBe(1);
  });

  it('tags every desktop rail button with data-hiw-rail={index}', () => {
    const { container } = render(<HowItWorks />);
    const rails = railButtons(container);
    expect(rails.length).toBe(5);
    rails.forEach((btn, i) => {
      expect(btn.getAttribute('data-hiw-rail')).toBe(String(i));
    });
  });

  it('renders exactly 5 rail buttons with rail nums and labels from HIW_STEPS', () => {
    const { container } = render(<HowItWorks />);
    const rails = railButtons(container);
    expect(rails.length).toBe(5);
    rails.forEach((btn, i) => {
      const step = HIW_STEPS[i]!;
      expect(btn.textContent).toContain(step.rail.num);
      expect(btn.textContent).toContain(step.rail.label);
    });
  });

  it('desktop narration has data-animate="narr-title" and data-animate="narr-body"', () => {
    const { container } = render(<HowItWorks />);
    expect(narrTitleEl(container)).not.toBeNull();
    expect(narrBodyEl(container)).not.toBeNull();
    // Both are desktop-only markers — duplicates would break SplitText.
    expect(
      container.querySelectorAll('[data-animate="narr-title"]').length,
    ).toBe(1);
    expect(
      container.querySelectorAll('[data-animate="narr-body"]').length,
    ).toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe('HowItWorks — desktop phase state', () => {
  it('starts on phase 0 — Meet narration, Draft chip, Escrow #4821', () => {
    const { container } = render(<HowItWorks />);
    // Desktop narration title (not mobile cards)
    expect(narrTitleEl(container)?.textContent).toContain('Three wallets');
    // Desktop ledger amount starts at 0
    expect(ledgerAmountEl(container)?.textContent).toBe('0');
    // State chip reads "Draft"
    expect(stateChipEl(container)?.textContent).toMatch(/draft/i);
    // The aside aria-label includes Escrow #4821 · Draft
    const aside = container.querySelector('aside[aria-label*="Escrow #4821"]');
    expect(aside).not.toBeNull();
  });

  it('updates the DESKTOP narration title when a rail button is clicked', () => {
    const { container } = render(<HowItWorks />);
    fireEvent.click(railButtons(container)[2]!); // Lock
    expect(narrTitleEl(container)?.textContent).toContain('The contract');
    fireEvent.click(railButtons(container)[4]!); // Release
    expect(narrTitleEl(container)?.textContent).toContain('Funds released');
  });

  it('updates the DESKTOP ledger amount display when active phase changes', () => {
    const { container } = render(<HowItWorks />);
    fireEvent.click(railButtons(container)[2]!); // Lock → 2,400
    expect(ledgerAmountEl(container)?.textContent).toBe('2,400');
    fireEvent.click(railButtons(container)[0]!); // back to Meet → 0
    expect(ledgerAmountEl(container)?.textContent).toBe('0');
  });

  it('updates the DESKTOP state chip to the active phase stateLabel', () => {
    const { container } = render(<HowItWorks />);
    expect(stateChipEl(container)?.textContent).toMatch(/draft/i);
    fireEvent.click(railButtons(container)[3]!); // Deliver → "Confirmed"
    expect(stateChipEl(container)?.textContent).toMatch(/confirmed/i);
    fireEvent.click(railButtons(container)[4]!); // Release → "Released"
    expect(stateChipEl(container)?.textContent).toMatch(/released/i);
  });

  it('marks exactly one DESKTOP rail button as aria-pressed=true at a time', () => {
    const { container } = render(<HowItWorks />);
    const rails = railButtons(container);
    const pressed = () =>
      rails.filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed().length).toBe(1);
    expect(pressed()[0]!.getAttribute('data-hiw-rail')).toBe('0');
    fireEvent.click(rails[2]!);
    expect(pressed().length).toBe(1);
    expect(pressed()[0]!.getAttribute('data-hiw-rail')).toBe('2');
    fireEvent.click(rails[4]!);
    expect(pressed().length).toBe(1);
    expect(pressed()[0]!.getAttribute('data-hiw-rail')).toBe('4');
  });

  it('progress bar width equals (active+1)/5 * 100%', () => {
    const { container } = render(<HowItWorks />);
    const bar = () =>
      container.querySelector<HTMLElement>('.hiw__progress > i');
    // Active = 0
    expect(bar()!.style.width).toBe('20%');
    fireEvent.click(railButtons(container)[2]!); // active = 2
    expect(bar()!.style.width).toBe('60%');
    fireEvent.click(railButtons(container)[4]!); // active = 4
    expect(bar()!.style.width).toBe('100%');
  });
});

// ---------------------------------------------------------------------------
describe('HowItWorks — mobile step-deck (always in DOM)', () => {
  it('renders the .hiw__deck container with 5 .hiw__phaseCard sections', () => {
    const { container } = render(<HowItWorks />);
    const deck = deckEl(container);
    expect(deck).not.toBeNull();
    expect(phaseCards(container).length).toBe(5);
  });

  it('each phase card has an id="hiw-card-N-title"', () => {
    const { container } = render(<HowItWorks />);
    const cards = phaseCards(container);
    cards.forEach((card, i) => {
      const title = card.querySelector(`#hiw-card-${i}-title`);
      expect(title).not.toBeNull();
      expect(title!.tagName.toLowerCase()).toBe('h3');
    });
  });

  it('each phase card renders a HiwPhaseDiagram SVG via viewBox "0 0 480 320"', () => {
    const { container } = render(<HowItWorks />);
    const cards = phaseCards(container);
    cards.forEach((card) => {
      const svg = card.querySelector('svg[viewBox="0 0 480 320"]');
      expect(svg).not.toBeNull();
    });
  });

  it('mobile phase nav renders 5 anchor pips linking to #hiw-card-N-title', () => {
    const { container } = render(<HowItWorks />);
    const nav = phaseNav(container);
    expect(nav).not.toBeNull();
    const pips = nav!.querySelectorAll('a');
    expect(pips.length).toBe(5);
    pips.forEach((pip, i) => {
      expect(pip.getAttribute('href')).toBe(`#hiw-card-${i}-title`);
    });
  });

  it('each mobile card carries its own phase-specific state label (each of Draft/Signed/Locked/Confirmed/Released appears once in the deck)', () => {
    const { container } = render(<HowItWorks />);
    const deck = deckEl(container)!;
    const labels = ['Draft', 'Signed', 'Locked', 'Confirmed', 'Released'];
    labels.forEach((label) => {
      // The <dd> carrying the per-card state label uses the .hiw__state class
      // (same as desktop chip) but without aria-live — exactly 5 occurrences
      // appear in the mobile deck (one per card) regardless of desktop phase.
      const matches = within(deck).getAllByText(label);
      // Each label should appear exactly once in the mobile deck.
      expect(matches.length).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
describe('HowItWorks — rail interactions', () => {
  it('rail buttons are type="button"', () => {
    const { container } = render(<HowItWorks />);
    railButtons(container).forEach((b) => {
      expect(b.getAttribute('type')).toBe('button');
    });
  });

  it('does not re-invoke setActive when clicking already-active rail (same aria-pressed state)', () => {
    const { container } = render(<HowItWorks />);
    const rails = railButtons(container);
    // Initially 0 is active.
    expect(rails[0]!.getAttribute('aria-pressed')).toBe('true');
    // Click it twice; aria-pressed stays true (active unchanged).
    fireEvent.click(rails[0]!);
    fireEvent.click(rails[0]!);
    expect(rails[0]!.getAttribute('aria-pressed')).toBe('true');
    // Ledger amount still 0 (no phase change).
    expect(ledgerAmountEl(container)?.textContent).toBe('0');
  });
});

// ---------------------------------------------------------------------------
describe('HowItWorks — a11y semantics', () => {
  it('section aria-label is "How it works in five steps"', () => {
    const { container } = render(<HowItWorks />);
    const section = container.querySelector('section#hiw');
    expect(section?.getAttribute('aria-label')).toBe(
      'How it works in five steps',
    );
  });

  it('desktop ledger has aria-label containing "Escrow #4821"', () => {
    const { container } = render(<HowItWorks />);
    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside!.getAttribute('aria-label')).toContain('Escrow #4821');
  });

  it('desktop rail nav has aria-label "How it works step rail"', () => {
    const { container } = render(<HowItWorks />);
    const railNav = container.querySelector(
      'nav[aria-label="How it works step rail"]',
    );
    expect(railNav).not.toBeNull();
  });

  it('desktop state chip has aria-live="polite"', () => {
    const { container } = render(<HowItWorks />);
    const chip = stateChipEl(container);
    expect(chip).not.toBeNull();
    expect(chip!.getAttribute('aria-live')).toBe('polite');
  });

  it('mobile phase nav has aria-label "Phase navigation"', () => {
    const { container } = render(<HowItWorks />);
    expect(phaseNav(container)).not.toBeNull();
  });
});
