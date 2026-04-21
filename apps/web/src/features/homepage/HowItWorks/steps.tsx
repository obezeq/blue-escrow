// v6 HIW step data — copy verbatim from Blue Escrow v6.html:1487-1523.
//
// Each phase drives the narration text, the ledger state chip, the ledger
// amount, the active rail button, and the active actor on the diagram.

import type { ReactNode } from 'react';
import { Fragment } from 'react';

export type LedgerState = 'draft' | 'signed' | 'locked' | 'delivered' | 'released';

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
  activeActor: 'all' | 'client' | 'mid' | 'seller' | null;
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
  },
];

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
