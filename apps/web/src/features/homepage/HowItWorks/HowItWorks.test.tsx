import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

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
import { HIW_STEPS } from './steps';

afterEach(cleanup);

describe('HowItWorks (v6)', () => {
  it('renders the v6 eyebrow + heading with emphasis + subtitle', () => {
    render(<HowItWorks />);
    expect(screen.getByText('How it works')).toBeDefined();
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Three people');
    expect(heading.querySelector('em')?.textContent).toBe('smart contract.');
    expect(
      screen.getByText(/Scroll to watch one deal unfold/),
    ).toBeDefined();
  });

  it('renders all 5 rail buttons with numbers + labels', () => {
    render(<HowItWorks />);
    HIW_STEPS.forEach((s) => {
      expect(screen.getByText(s.rail.num)).toBeDefined();
      expect(screen.getByText(s.rail.label)).toBeDefined();
    });
  });

  it('starts on step 01 with the Meet narration', () => {
    const { container } = render(<HowItWorks />);
    // Narration label format may be "Step 01 · Meet" or "STEP 01 — MEET";
    // match either via case-insensitive regex with both separators.
    expect(
      screen.getAllByText(/step\s*01\s*[·—]\s*meet/i).length,
    ).toBeGreaterThanOrEqual(1);
    // Multiple h3s exist now (desktop narration + mobile deck cards). Scope
    // the query to the live narration block.
    const narrationTitle = container.querySelector('.hiw__narrationTitle');
    expect(narrationTitle?.textContent).toContain('Three wallets');
  });

  it('switches the active step when a rail button is clicked', () => {
    const { container } = render(<HowItWorks />);
    fireEvent.click(screen.getByText('Lock').closest('button')!);
    expect(
      screen.getAllByText(/step\s*03\s*[·—]\s*lock/i).length,
    ).toBeGreaterThanOrEqual(1);
    const narrationTitle = container.querySelector('.hiw__narrationTitle');
    expect(narrationTitle?.textContent).toContain('The contract');
  });

  it('updates the ledger amount when phase advances to Lock', () => {
    const { container } = render(<HowItWorks />);
    fireEvent.click(screen.getByText('Lock').closest('button')!);
    // "2,400" appears both as the big ledger number and as the log entry
    // "2,400 USDC locked" — scope to the data-tagged ledger amount.
    const amount = container.querySelector('[data-hiw-ledger="amount"]');
    expect(amount?.textContent).toBe('2,400');
  });

  it('updates the state chip label per phase', () => {
    const { container } = render(<HowItWorks />);
    // "Draft" / "Released" can appear in the state chip AND in the aside
    // aria-label ("Escrow #4821 · Draft"). Scope to the chip via .hiw__state.
    const chip = () => container.querySelector('.hiw__state');
    expect(chip()?.textContent).toMatch(/draft/i);
    fireEvent.click(screen.getByText('Release').closest('button')!);
    expect(chip()?.textContent).toMatch(/released/i);
  });

  it('marks the active rail button with aria-pressed=true', () => {
    render(<HowItWorks />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(buttons[2]!);
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('false');
    expect(buttons[2]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders as <section id="hiw"> with accessible label', () => {
    const { container } = render(<HowItWorks />);
    const section = container.querySelector('section');
    expect(section?.id).toBe('hiw');
    expect(section?.getAttribute('aria-label')).toBe(
      'How it works in five steps',
    );
  });

  it('renders the v6 SVG diagram with 3 actors, a packet, and wire overlays', () => {
    const { container } = render(<HowItWorks />);
    const svg = container.querySelector('svg[viewBox="0 0 1200 720"]');
    expect(svg).not.toBeNull();
    expect(
      svg?.querySelector('[data-hiw="actor-client"]'),
    ).not.toBeNull();
    expect(svg?.querySelector('[data-hiw="actor-mid"]')).not.toBeNull();
    expect(
      svg?.querySelector('[data-hiw="actor-seller"]'),
    ).not.toBeNull();
    expect(svg?.querySelector('[data-hiw="packet"]')).not.toBeNull();
    expect(
      svg?.querySelector('[data-hiw="wire-active-C"]'),
    ).not.toBeNull();
    expect(
      svg?.querySelector('[data-hiw="wire-active-M"]'),
    ).not.toBeNull();
    expect(
      svg?.querySelector('[data-hiw="wire-active-S"]'),
    ).not.toBeNull();
  });

  it('tags the ledger amount so the timeline can tween its text content', () => {
    const { container } = render(<HowItWorks />);
    const amount = container.querySelector('[data-hiw-ledger="amount"]');
    expect(amount).not.toBeNull();
    expect(amount?.textContent).toBe('0');
  });

  it('tags every rail button with its phase index for scroll-seek', () => {
    const { container } = render(<HowItWorks />);
    const rails = container.querySelectorAll('[data-hiw-rail]');
    expect(rails.length).toBe(5);
    rails.forEach((btn, i) => {
      expect(btn.getAttribute('data-hiw-rail')).toBe(String(i));
    });
  });

  it('preserves the wire-base data-hiw selectors after the SVG class migration', () => {
    // After moving stroke="#213B78" to className={hiw__diagWire}, the
    // GSAP-targeted selectors must still be queryable by attribute.
    const { container } = render(<HowItWorks />);
    expect(container.querySelector('[data-hiw="wire-base-C"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="wire-base-M"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="wire-base-S"]')).not.toBeNull();
  });

  it('preserves actor SVG roots (data-hiw="actor-*") and the packet for GSAP', () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelector('[data-hiw="actor-client"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="actor-mid"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="actor-seller"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="packet"]')).not.toBeNull();
  });

  it('keeps the diagram theme-aware classes attached to the SVG actor pucks', () => {
    // Regression: after the className migration these classes must show up
    // on the actor circles (vitest.config has classNameStrategy: non-scoped
    // so we can match the literal CSS Module name).
    const { container } = render(<HowItWorks />);
    const pucks = container.querySelectorAll('.hiw__diagActorPuck');
    expect(pucks.length).toBe(3);
    const roleLabels = container.querySelectorAll('.hiw__diagActorRole');
    expect(roleLabels.length).toBe(3);
  });
});
