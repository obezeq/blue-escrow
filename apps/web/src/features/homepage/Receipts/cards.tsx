// v6 Receipts card data + inline SVG visuals (Blue Escrow v6.html:1653-1714).
// Kept verbatim so the hashes and counts match v6 copy exactly.

import type { ReactNode } from 'react';

export type ReceiptVariant = 'soul' | 'client' | 'seller';

export interface ReceiptCard {
  variant: ReceiptVariant;
  headerLabel: string;
  headerMeta: string;
  title: ReactNode;
  metaLine: string;
  hash: string;
  visual: ReactNode;
  figCaption: string; // NEW — screen-reader description for <figure><figcaption>
}

// All strokes/fills inherit `currentColor` from the parent
// .receipts__card--soul, which flips per theme (white on dark surface,
// dark text on light surface). The radial gradient core consumes
// `var(--receipt-soul-core)` via inline CSS style (SVG attributes don't
// accept `var()`; the `stop-color` CSS property does), so the inner
// glow flips in lockstep: white on dark, brand-blue on light.
const SoulVisual = (
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <radialGradient id="receipt-soul-gradient" cx="50%" cy="50%">
        <stop
          offset="0"
          style={{ stopColor: 'var(--receipt-soul-core)', stopOpacity: 0.9 }}
        />
        <stop
          offset="1"
          style={{ stopColor: 'var(--receipt-soul-core)', stopOpacity: 0 }}
        />
      </radialGradient>
    </defs>
    <circle
      data-animate="soul-ring"
      cx="100"
      cy="100"
      r="72"
      fill="none"
      stroke="currentColor"
      strokeOpacity=".4"
      strokeWidth="1"
      strokeDasharray="2 5"
    />
    <circle
      cx="100"
      cy="100"
      r="56"
      fill="none"
      stroke="currentColor"
      strokeOpacity=".5"
      strokeWidth="1"
    />
    <circle cx="100" cy="100" r="36" fill="url(#receipt-soul-gradient)" />
    <g stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round">
      <line x1="100" y1="28" x2="100" y2="42" />
      <line x1="100" y1="158" x2="100" y2="172" />
      <line x1="28" y1="100" x2="42" y2="100" />
      <line x1="158" y1="100" x2="172" y2="100" />
    </g>
  </svg>
);

const ClientVisual = (
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <rect
      x="36"
      y="36"
      width="128"
      height="128"
      rx="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity=".35"
    />
    <rect
      x="52"
      y="52"
      width="96"
      height="96"
      rx="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    />
    <path
      d="M 68 108 L 92 130 L 140 76"
      stroke="var(--receipt-accent)"
      strokeWidth="3.2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text
      x="100"
      y="184"
      textAnchor="middle"
      fontFamily="Geist Mono"
      fontSize="10"
      fill="currentColor"
      opacity=".6"
    >
      2,400 USDC
    </text>
  </svg>
);

const SellerVisual = (
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <circle
      cx="100"
      cy="100"
      r="72"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      opacity=".3"
    />
    <g transform="translate(100 100)">
      <polygon
        points="0,-52 45,-26 45,26 0,52 -45,26 -45,-26"
        fill="none"
        stroke="var(--receipt-accent-soft)"
        strokeWidth="1.5"
      />
      <polygon
        points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16"
        fill="color-mix(in srgb, var(--receipt-accent) 25%, transparent)"
        stroke="var(--receipt-accent)"
        strokeWidth="1.5"
      />
      <circle cx="0" cy="0" r="8" fill="var(--receipt-center-dot)" />
    </g>
    <text
      x="100"
      y="184"
      textAnchor="middle"
      fontFamily="Geist Mono"
      fontSize="10"
      fill="currentColor"
      opacity=".7"
    >
      +12 REP
    </text>
  </svg>
);

export const RECEIPTS_CARDS: ReceiptCard[] = [
  {
    variant: 'soul',
    headerLabel: 'Soulbound · BES-ID',
    headerMeta: '#00142',
    title: (
      <>
        Middleman
        <br />
        reputation
      </>
    ),
    metaLine: 'Non-transferable · 214 deals',
    hash: '0xbe…id4 21c',
    visual: SoulVisual,
    figCaption:
      'Soulbound middleman reputation badge — three concentric rings with a radiant inner core and four crosshair marks, representing a non-transferable on-chain identity.',
  },
  {
    variant: 'client',
    headerLabel: 'Client Receipt · #4821',
    headerMeta: 'Released',
    title: (
      <>
        Paid
        <br />
        in full
      </>
    ),
    metaLine: 'Client · 2,400 USDC · Arbitrum',
    hash: '0x7a2f…e91c',
    visual: ClientVisual,
    figCaption:
      'Client payment receipt illustration — a rounded frame with a checkmark confirming the release of 2,400 USDC on Arbitrum.',
  },
  {
    variant: 'seller',
    headerLabel: 'Seller Receipt · #4821',
    headerMeta: 'Completed',
    title: (
      <>
        Delivered
        <br />
        on time
      </>
    ),
    metaLine: 'Seller · Streak 8 · REP 4.96',
    hash: '0xd20e…77ab',
    visual: SellerVisual,
    figCaption:
      'Seller completion receipt illustration — a hexagonal medallion with a central dot and +12 reputation indicator, marking a delivered deal.',
  },
];
