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
}

const SoulVisual = (
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <radialGradient id="receipt-soul-gradient" cx="50%" cy="50%">
        <stop offset="0" stopColor="#fff" stopOpacity=".9" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle
      cx="100"
      cy="100"
      r="72"
      fill="none"
      stroke="rgba(255,255,255,.28)"
      strokeWidth="1"
      strokeDasharray="2 5"
    />
    <circle
      cx="100"
      cy="100"
      r="56"
      fill="none"
      stroke="rgba(255,255,255,.5)"
      strokeWidth="1"
    />
    <circle cx="100" cy="100" r="36" fill="url(#receipt-soul-gradient)" />
    <g stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round">
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
      stroke="#0091FF"
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
        stroke="#33AAFF"
        strokeWidth="1.5"
      />
      <polygon
        points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16"
        fill="rgba(0,145,255,.25)"
        stroke="#0091FF"
        strokeWidth="1.5"
      />
      <circle cx="0" cy="0" r="8" fill="#fff" />
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
  },
];
