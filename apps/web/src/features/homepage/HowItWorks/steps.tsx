// v6 HIW step data — copy verbatim from Blue Escrow v6.html:1487-1523.
//
// Each phase drives the narration text, the ledger state chip, the ledger
// amount, the active rail button, the active actor, and the GSAP timeline
// choreography (wire activation, packet flight, amount tween).

import type { ReactNode } from 'react';
import { Fragment } from 'react';

export type LedgerState = 'draft' | 'signed' | 'locked' | 'delivered' | 'released';

export type ActorId = 'client' | 'mid' | 'seller';
export type WireId = 'C' | 'M' | 'S';

export interface HiwChoreo {
  /** Which active-overlay wires are lit this phase (C = client↔core, M = mid↔core, S = seller↔core) */
  wiresActive: WireId[];
  /** Where the money packet starts this phase. null = hidden */
  packetFrom: 'client' | 'core' | null;
  /** Where the money packet ends this phase. null = hidden */
  packetTo: 'core' | 'seller' | null;
  /** Tween the ledger amount display from -> to over the phase sub-timeline */
  amountTween?: { from: number; to: number };
  /** Pulse/glow the central contract core */
  coreGlow?: 'idle' | 'locked' | 'released';
}

export interface HiwStep {
  index: 0 | 1 | 2 | 3 | 4;
  rail: { num: string; label: string };
  narr: {
    step: string;
    title: ReactNode;
    body: string;
  };
  ledger: {
    state: LedgerState;
    stateLabel: string;
    amount: number;
    activeLogIndex: number;
  };
  activeActor: 'all' | ActorId | null;
  choreo: HiwChoreo;
}

export const HIW_STEPS: HiwStep[] = [
  {
    index: 0,
    rail: { num: '01', label: 'Meet' },
    narr: {
      step: 'Step 01 · Meet',
      title: (
        <Fragment>
          Three wallets <em>show up.</em>
        </Fragment>
      ),
      body: 'Client, middleman, seller — all connect. No accounts, no KYC queues. The wallet is the identity.',
    },
    ledger: {
      state: 'draft',
      stateLabel: 'Draft',
      amount: 0,
      activeLogIndex: 0,
    },
    activeActor: 'all',
    choreo: {
      wiresActive: [],
      packetFrom: null,
      packetTo: null,
      coreGlow: 'idle',
    },
  },
  {
    index: 1,
    rail: { num: '02', label: 'Sign' },
    narr: {
      step: 'Step 02 · Sign',
      title: (
        <Fragment>
          Terms signed <em>three times.</em>
        </Fragment>
      ),
      body: 'Each wallet signs the deal on-chain. Terms locked: amount, fee split, arbitration rules. Nothing can change now.',
    },
    ledger: {
      state: 'signed',
      stateLabel: 'Signed',
      amount: 0,
      activeLogIndex: 1,
    },
    activeActor: 'all',
    choreo: {
      wiresActive: ['C', 'M', 'S'],
      packetFrom: null,
      packetTo: null,
      coreGlow: 'idle',
    },
  },
  {
    index: 2,
    rail: { num: '03', label: 'Lock' },
    narr: {
      step: 'Step 03 · Lock',
      title: (
        <Fragment>
          The contract <em>holds the money.</em>
        </Fragment>
      ),
      body: '2,400 USDC flows from client into the contract. Not to the middleman, not to the seller — into code.',
    },
    ledger: {
      state: 'locked',
      stateLabel: 'Locked',
      amount: 2400,
      activeLogIndex: 2,
    },
    activeActor: 'client',
    choreo: {
      wiresActive: ['C'],
      packetFrom: 'client',
      packetTo: 'core',
      amountTween: { from: 0, to: 2400 },
      coreGlow: 'locked',
    },
  },
  {
    index: 3,
    rail: { num: '04', label: 'Deliver' },
    narr: {
      step: 'Step 04 · Deliver',
      title: (
        <Fragment>
          Work lands. <em>Both parties confirm.</em>
        </Fragment>
      ),
      body: 'Seller delivers. Client accepts. Middleman stays silent unless called — the happy path skips them entirely.',
    },
    ledger: {
      state: 'locked',
      stateLabel: 'Confirmed',
      amount: 2400,
      activeLogIndex: 3,
    },
    activeActor: 'seller',
    choreo: {
      wiresActive: ['S'],
      packetFrom: null,
      packetTo: null,
      coreGlow: 'locked',
    },
  },
  {
    index: 4,
    rail: { num: '05', label: 'Release' },
    narr: {
      step: 'Step 05 · Release',
      title: (
        <Fragment>
          Funds released. <em>Three receipts minted.</em>
        </Fragment>
      ),
      body: 'Contract pays the seller, deducts the protocol fee and the middleman fee, mints a soulbound NFT to the middleman and receipts to the client and seller.',
    },
    ledger: {
      state: 'released',
      stateLabel: 'Released',
      amount: 2400,
      activeLogIndex: 4,
    },
    activeActor: 'seller',
    choreo: {
      wiresActive: ['S'],
      packetFrom: 'core',
      packetTo: 'seller',
      coreGlow: 'released',
    },
  },
];

// SVG viewBox coordinates (v6 HTML:1390-1483 uses viewBox="0 0 1200 720")
// Actor positions below match the translate() on each actor <g> in v6.
export const SVG_VIEW_BOX = { width: 1200, height: 720 };

export const ACTOR_POSITIONS: Record<ActorId, { x: number; y: number }> = {
  client: { x: 180, y: 420 },
  mid: { x: 600, y: 120 },
  seller: { x: 1020, y: 420 },
};

// Contract core position
export const CORE_POSITION = { x: 600, y: 380 };

export const LEDGER_LOGS: { time: string; label: ReactNode; hash: string }[] = [
  { time: '00:00', label: 'Parties connected', hash: '0x7a…e91c' },
  { time: '00:42', label: 'Terms signed ×3', hash: '0x4b…11de' },
  { time: '01:18', label: '2,400 USDC locked', hash: '0xd2…77ab' },
  { time: '03:24', label: 'Delivery confirmed', hash: '0x92…501f' },
  {
    time: '03:36',
    label: (
      <Fragment>
        Released · <em>3 receipts minted</em>
      </Fragment>
    ),
    hash: '0xfe…c001',
  },
];
