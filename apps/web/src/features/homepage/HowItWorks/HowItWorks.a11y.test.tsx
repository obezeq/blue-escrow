// Axe a11y smoke for <HowItWorks /> in both dark and light themes so a
// theme-specific contrast/aria regression in either palette is caught here.
// Animations are mocked because GSAP + ScrollTrigger don't run cleanly in
// jsdom and they don't affect the static accessibility tree.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('./HowItWorksAnimations', () => ({
  HowItWorksAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { HowItWorks } from './HowItWorks';

// The ledger card is rendered as <aside> inside the <section>. Axe's
// landmark-complementary-is-top-level rule discourages nested complementary
// landmarks, but ARIA permits <aside> nested inside a <section> to label a
// related side-block. We disable that single rule (everything else, including
// contrast, still runs).
const AXE_OPTIONS = {
  rules: {
    'landmark-complementary-is-top-level': { enabled: false },
  },
} as const;

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe.each(['dark', 'light'] as const)(
  'HowItWorks a11y (%s theme)',
  (theme) => {
    beforeEach(() => {
      document.documentElement.dataset.theme = theme;
    });

    it('has no detectable axe violations', async () => {
      const { container } = render(<HowItWorks />);
      const results = await axe(container, AXE_OPTIONS);
      expect(results).toHaveNoViolations();
    });

    it('exposes 5 rail buttons with aria-pressed state', () => {
      const { getAllByRole } = render(<HowItWorks />);
      const buttons = getAllByRole('button');
      expect(buttons.length).toBe(5);
      buttons.forEach((btn) => {
        expect(btn.hasAttribute('aria-pressed')).toBe(true);
      });
    });

    it('exposes the live region for the state chip', () => {
      const { container } = render(<HowItWorks />);
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).not.toBeNull();
    });
  },
);

describe('HowItWorks a11y (no theme dataset)', () => {
  it('renders cleanly when document has no data-theme (SSR pre-hydration)', async () => {
    const { container } = render(<HowItWorks />);
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it('renders the SVG diagram with all data-hiw actor + wire selectors', () => {
    const { container } = render(<HowItWorks />);
    // GSAP timeline targets these — never silently rename them.
    expect(container.querySelector('[data-hiw="actor-client"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="actor-mid"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="actor-seller"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="wire-base-C"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="wire-base-S"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="packet"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// v7 additions: mobile step-deck (5 hiw__phaseCard sections + hiw__phaseNav)
// The mobile deck duplicates the step data into stacked cards. The sticky
// phaseNav exposes 5 anchor pips linking to each card's h3 id. These tests
// guard the a11y contract of that subtree in both themes.
// ---------------------------------------------------------------------------

describe.each(['dark', 'light'] as const)(
  'HowItWorks a11y — mobile step-deck (%s theme)',
  (theme) => {
    beforeEach(() => {
      document.documentElement.dataset.theme = theme;
    });

    it('mobile phase nav has aria-label "Phase navigation"', () => {
      const { container } = render(<HowItWorks />);
      const nav = container.querySelector('[class*="hiw__phaseNav"]');
      expect(nav).not.toBeNull();
      expect(nav?.getAttribute('aria-label')).toBe('Phase navigation');
    });

    it('every phase card has an h3 heading (level 3)', () => {
      const { container } = render(<HowItWorks />);
      // Note: `[class*="hiw__phaseCard"]` also matches children like
      // `hiw__phaseCardHead/Title/Body/Diagram/Ledger` (6×5=30 hits); scope
      // to the <section> wrapper via the data attribute instead.
      const cards = container.querySelectorAll(
        'section[data-hiw-phase-card]',
      );
      expect(cards.length).toBe(5);
      cards.forEach((card) => {
        const h3 = card.querySelector('h3');
        expect(h3).not.toBeNull();
        expect(h3?.tagName).toBe('H3');
      });
    });

    it('every phase card id matches the format hiw-card-N-title and is referenced by the aria-labelledby on its section', () => {
      const { container } = render(<HowItWorks />);
      const cards = container.querySelectorAll(
        'section[data-hiw-phase-card]',
      );
      expect(cards.length).toBe(5);
      cards.forEach((card, i) => {
        expect(card.getAttribute('aria-labelledby')).toBe(
          `hiw-card-${i}-title`,
        );
        const titleEl = card.querySelector(`#hiw-card-${i}-title`);
        expect(titleEl).not.toBeNull();
        expect(titleEl?.tagName).toBe('H3');
      });
    });

    it('every phase nav pip has an accessible name via aria-label "Go to {label}"', () => {
      const { container } = render(<HowItWorks />);
      const nav = container.querySelector('[class*="hiw__phaseNav"]');
      const pips = nav?.querySelectorAll('a[href^="#hiw-card-"]') ?? [];
      expect(pips.length).toBe(5);
      const expectedLabels = ['Meet', 'Sign', 'Lock', 'Deliver', 'Release'];
      pips.forEach((pip, i) => {
        expect(pip.getAttribute('aria-label')).toBe(
          `Go to ${expectedLabels[i]}`,
        );
        expect(pip.getAttribute('href')).toBe(`#hiw-card-${i}-title`);
      });
    });

    it('mobile step-deck does not introduce axe violations on phase card #0 in isolation', async () => {
      const { container } = render(<HowItWorks />);
      const card0 = container.querySelector(
        'section[data-hiw-phase-card="0"]',
      );
      expect(card0).not.toBeNull();
      const results = await axe(card0 as Element, AXE_OPTIONS);
      expect(results).toHaveNoViolations();
    });

    it('mobile step-deck does not introduce axe violations on phase card #4 in isolation (released state)', async () => {
      const { container } = render(<HowItWorks />);
      const card4 = container.querySelector(
        'section[data-hiw-phase-card="4"]',
      );
      expect(card4).not.toBeNull();
      const results = await axe(card4 as Element, AXE_OPTIONS);
      expect(results).toHaveNoViolations();
    });
  },
);

// ---------------------------------------------------------------------------
// Desktop narration reveal hooks — single source of truth. The GSAP scroll
// timeline targets exactly one [data-animate="narr-title"] and one
// [data-animate="narr-body"]; duplicates would cause double-tween jank.
// ---------------------------------------------------------------------------

describe('HowItWorks a11y — desktop narration reveal hooks', () => {
  it('exactly one element matches [data-animate="narr-title"]', () => {
    const { container } = render(<HowItWorks />);
    const nodes = container.querySelectorAll('[data-animate="narr-title"]');
    expect(nodes.length).toBe(1);
  });

  it('exactly one element matches [data-animate="narr-body"]', () => {
    const { container } = render(<HowItWorks />);
    const nodes = container.querySelectorAll('[data-animate="narr-body"]');
    expect(nodes.length).toBe(1);
  });

  it('narr-title is an h3 heading level 3', () => {
    const { container } = render(<HowItWorks />);
    const el = container.querySelector('[data-animate="narr-title"]');
    expect(el).not.toBeNull();
    expect(el?.tagName).toBe('H3');
  });
});

// ---------------------------------------------------------------------------
// Phase state regression — clicking the rail must update the narration text
// and state chip without introducing axe violations. Runs in dark theme only
// because the dual-theme axe sweep above already catches palette regressions;
// here we care about the state-change transition. Interaction via fireEvent.
// ---------------------------------------------------------------------------

describe('HowItWorks a11y — phase state regression (desktop)', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = 'dark';
  });

  it('clicking rail "Lock" updates the desktop narration text without introducing axe violations', async () => {
    const { container } = render(<HowItWorks />);
    const lockButton = container.querySelector('[data-hiw-rail="2"]');
    expect(lockButton).not.toBeNull();
    fireEvent.click(lockButton as Element);

    const narrTitle = container.querySelector('[data-animate="narr-title"]');
    expect(narrTitle?.textContent).toContain('contract');
    const narrBody = container.querySelector('[data-animate="narr-body"]');
    expect(narrBody?.textContent).toMatch(/2,400 USDC/);

    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it('clicking rail "Release" flips state chip to "Released" with no axe violations', async () => {
    const { container } = render(<HowItWorks />);
    const releaseButton = container.querySelector('[data-hiw-rail="4"]');
    expect(releaseButton).not.toBeNull();
    fireEvent.click(releaseButton as Element);

    // The desktop ledger chip lives under the aside and has aria-live=polite.
    const chip = container.querySelector(
      'aside[aria-label^="Escrow"] [aria-live="polite"]',
    );
    expect(chip?.textContent).toMatch(/released/i);

    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// WCAG 2.1 AA explicit numeric contrast coverage.
//
// Why this block exists (ref issue #94, A4 comment #4300316967):
//   axe-core 4.11 bails on radial gradients — flags them as "needs-review"
//   but never fails a run. So jest-axe alone under-covers the .hiw__coreDisc
//   glow surface (Wave A tokenized it) and any elevated card pair. This
//   block asserts explicit numeric contrast ratios on *flat-surface* token
//   pairs so a silent regression in either theme fails CI.
//
// Implementation note — jsdom + CSS custom properties:
//   jsdom's getComputedStyle(document.documentElement).getPropertyValue(
//   '--text') returns ''. The global stylesheet isn't loaded into the test
//   environment (vitest.config.ts only enables CSS Module class-name
//   extraction, not global @import resolution). Rather than wire a
//   Sass-to-jsdom bridge just for these asserts, the palette is mirrored
//   as constants below from apps/web/src/styles/settings/_variables.scss.
//   This decouples the test from CSS loading but still enforces intent:
//   if someone edits _variables.scss and this file stays in sync, the
//   ratios are checked; if only _variables.scss changes, the test drifts
//   and Wave C visual regression catches the palette mismatch.
// ---------------------------------------------------------------------------

/** WCAG 2.1 relative luminance for sRGB (eq. 2). */
function relativeLuminance(r: number, g: number, b: number): number {
  const srgb = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
}

/** WCAG 2.1 contrast ratio (eq. 3), range [1, 21]. */
function contrastRatio(
  rgb1: readonly [number, number, number],
  rgb2: readonly [number, number, number],
): number {
  const L1 = relativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const L2 = relativeLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Parse "#rrggbb" / "rgb(r,g,b)" / "rgba(r,g,b,a)". Rejects gradients / empty. */
function parseColor(cssValue: string): [number, number, number] {
  const trimmed = cssValue.trim();
  if (trimmed === '' || trimmed === 'transparent' || trimmed === 'initial') {
    throw new Error(`Cannot parse color: "${cssValue}"`);
  }
  const hex = trimmed.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }
  const rgb = trimmed.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) {
    return [
      parseInt(rgb[1]!, 10),
      parseInt(rgb[2]!, 10),
      parseInt(rgb[3]!, 10),
    ];
  }
  throw new Error(`Cannot parse color: "${cssValue}"`);
}

// Palette mirrored from apps/web/src/styles/settings/_variables.scss.
// If you change _variables.scss, update these in lockstep.
const TOKENS = {
  dark: {
    bgPage: '#0b1117',
    bgSurface: '#111b2a',
    bgElevated: '#15233a',
    text: '#e6edf3',
    textMuted: '#8b949e',
    // --accent resolves to var(--blue-vivid) = #0091ff in dark.
    accent: '#0091ff',
    // HIW SVG-specific tokens (#99).
    // `--hiw-actor-bg` is the puck surface; role/name/wallet sit on top of it.
    hiwActorBg: '#071230',
    hiwRoleLabel: '#33aaff', // --blue-text — saturated enough to clear 4.5:1 on deep navy
    hiwActorName: '#e6edf3', // --text — primary identity
    hiwActorWallet: '#9fa8b3', // color-mix(in oklch, #8b949e 92%, #33aaff 8%) resolved
  },
  light: {
    bgPage: '#ffffff',
    bgSurface: '#f5f8fc',
    bgElevated: '#ffffff',
    text: '#0a0a0a',
    textMuted: '#5a6474',
    // --accent resolves to var(--blue-primary) = #0066ff in light.
    accent: '#0066ff',
    // HIW SVG-specific tokens (#99).
    hiwActorBg: '#e6f1ff', // light puck surface
    hiwRoleLabel: '#0066ff', // --blue-primary — AA on light-blue surface
    hiwActorName: '#0a0a0a',
    hiwActorWallet: '#5a6474', // --text-muted
  },
} as const;

describe('HowItWorks — WCAG AA contrast explicit (flat-surface pairs)', () => {
  describe('parseColor', () => {
    it('parses 6-digit hex', () => {
      expect(parseColor('#ff0000')).toEqual([255, 0, 0]);
      expect(parseColor('#0091FF')).toEqual([0, 145, 255]);
    });

    it('parses rgb() / rgba()', () => {
      expect(parseColor('rgb(10, 20, 30)')).toEqual([10, 20, 30]);
      expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual([255, 0, 0]);
    });

    it('throws on unparseable input so a stray gradient fails loudly', () => {
      expect(() => parseColor('')).toThrow();
      expect(() => parseColor('transparent')).toThrow();
      expect(() => parseColor('linear-gradient(#000, #fff)')).toThrow();
    });
  });

  describe('contrastRatio self-check', () => {
    it('black on white is 21:1', () => {
      const ratio = contrastRatio([0, 0, 0], [255, 255, 255]);
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('same color on itself is 1:1', () => {
      const ratio = contrastRatio([127, 127, 127], [127, 127, 127]);
      expect(ratio).toBeCloseTo(1, 5);
    });
  });

  for (const theme of ['dark', 'light'] as const) {
    describe(`${theme} theme`, () => {
      const t = TOKENS[theme];

      it('body --text vs --bg-surface meets WCAG AA 4.5:1 (normal text)', () => {
        const ratio = contrastRatio(parseColor(t.text), parseColor(t.bgSurface));
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('body --text vs --bg-page meets WCAG AA 4.5:1 (normal text on page backdrop)', () => {
        const ratio = contrastRatio(parseColor(t.text), parseColor(t.bgPage));
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('body --text vs --bg-elevated meets WCAG AA 4.5:1 (normal text on ledger card)', () => {
        const ratio = contrastRatio(parseColor(t.text), parseColor(t.bgElevated));
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      // WCAG 2.1 SC 1.4.11 Non-text Contrast: 3:1 for UI component boundaries
      // and graphical objects. --accent is used for focus ring + active rail pip
      // strokes, not body text, so 3:1 is the correct floor (not 4.5:1).
      it('--accent vs --bg-surface meets WCAG AA 3:1 (SC 1.4.11 non-text UI contrast)', () => {
        const ratio = contrastRatio(parseColor(t.accent), parseColor(t.bgSurface));
        expect(ratio).toBeGreaterThanOrEqual(3);
      });

      it('--accent vs --bg-elevated meets WCAG AA 3:1 (SC 1.4.11 non-text UI contrast)', () => {
        const ratio = contrastRatio(parseColor(t.accent), parseColor(t.bgElevated));
        expect(ratio).toBeGreaterThanOrEqual(3);
      });

      // --text-muted on elevated card is used for secondary copy inside the
      // ledger (small labels, timestamps). WCAG SC 1.4.3 requires 4.5:1 for
      // normal text; loosen to 3:1 only if proven at >= 18pt (large text).
      // Dark --text-muted (#8b949e) on --bg-elevated (#15233a) measured at
      // ~5.6:1 and light --text-muted (#5a6474) on #ffffff at ~6.1:1 — both
      // clear the 4.5 floor, so we assert the strict normal-text threshold.
      it('--text-muted vs --bg-elevated meets WCAG AA 4.5:1 (SC 1.4.3 normal text)', () => {
        const ratio = contrastRatio(
          parseColor(t.textMuted),
          parseColor(t.bgElevated),
        );
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('--text-muted vs --bg-surface meets WCAG AA 4.5:1 (SC 1.4.3 normal text)', () => {
        const ratio = contrastRatio(
          parseColor(t.textMuted),
          parseColor(t.bgSurface),
        );
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// SVG diagram contrast — refs #99.
//
// The HIW diagram SVG renders CLIENT / MIDDLEMAN / SELLER role labels and
// actor names/wallets. Previously these texts fell back to `fill: black`
// because the corresponding CSS selectors were orphaned (see
// HowItWorks.module.scss.test.ts). Even once the fills exist, the three
// token pairs must pass:
//
//   (a) WCAG 2.2 SC 1.4.3 — 4.5:1 for normal text (12–17px).
//   (b) APCA Lc ≥ 75 for small labels (12–14px), Lc ≥ 60 for 14–17px body.
//
// APCA (WCAG 3 working draft, W3C APCA-W3 readability criterion) models
// perceptual contrast better than WCAG 2.x for colored foreground on
// colored background — which is exactly the "blue role label on deep navy
// puck" case here. Lc 75 is the silver-conformance threshold for 14px.
// ---------------------------------------------------------------------------

import { apcaLc } from '../../../test/apca';

describe('HowItWorks — SVG diagram contrast (WCAG 2.2 + APCA, refs #99)', () => {
  for (const theme of ['dark', 'light'] as const) {
    describe(`${theme} theme — diag role/name/wallet on puck surface`, () => {
      const t = TOKENS[theme];

      it('role label on puck meets WCAG AA 4.5:1', () => {
        const ratio = contrastRatio(
          parseColor(t.hiwRoleLabel),
          parseColor(t.hiwActorBg),
        );
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('role label on puck meets APCA Lc >= 75 (14px mono label)', () => {
        expect(apcaLc(t.hiwRoleLabel, t.hiwActorBg)).toBeGreaterThanOrEqual(75);
      });

      it('actor name on puck meets WCAG AA 4.5:1', () => {
        const ratio = contrastRatio(
          parseColor(t.hiwActorName),
          parseColor(t.hiwActorBg),
        );
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('actor name on puck meets APCA Lc >= 75 (17px sans body)', () => {
        expect(apcaLc(t.hiwActorName, t.hiwActorBg)).toBeGreaterThanOrEqual(75);
      });

      it('actor wallet on bg-surface meets WCAG AA 4.5:1', () => {
        const ratio = contrastRatio(
          parseColor(t.hiwActorWallet),
          parseColor(t.bgSurface),
        );
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('actor wallet on bg-surface meets APCA Lc >= 60 (13px mono muted)', () => {
        expect(apcaLc(t.hiwActorWallet, t.bgSurface)).toBeGreaterThanOrEqual(60);
      });
    });
  }
});

describe('apcaLc helper self-check', () => {
  it('black on white scores high Lc (>= 100)', () => {
    expect(apcaLc('#000000', '#ffffff')).toBeGreaterThanOrEqual(100);
  });

  it('identical colors score 0', () => {
    expect(apcaLc('#808080', '#808080')).toBe(0);
  });
});
