import { Fragment } from 'react';
import type { HiwStep } from './types';

export const HIW_STEPS: HiwStep[] = [
  {
    index: 0,
    rail: { num: '01', label: 'Meet' },
    narr: {
      step: 'STEP 01 — MEET',
      title: (
        <Fragment>
          Three wallets <em>show up.</em>
        </Fragment>
      ),
      body: 'Client, middleman, seller — three wallets connect. No accounts. No KYC queues. The wallet is the identity.',
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
      step: 'STEP 02 — SIGN',
      title: (
        <Fragment>
          Terms signed <em>three times.</em>
        </Fragment>
      ),
      body: 'Each wallet signs on-chain. Amount, fee split, arbitration — all locked. Nothing can change now.',
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
      step: 'STEP 03 — LOCK',
      title: (
        <Fragment>
          The contract <em>holds the money.</em>
        </Fragment>
      ),
      body: '2,400 USDC flows from the client into the contract. Not to the middleman. Not to the seller. Into code.',
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
      step: 'STEP 04 — DELIVER',
      title: (
        <Fragment>
          Work lands. <em>Both parties confirm.</em>
        </Fragment>
      ),
      body: 'Seller delivers. Client accepts. The middleman stays silent — the happy path never touches them.',
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
      step: 'STEP 05 — RELEASE',
      title: (
        <Fragment>
          Funds released. <em>Three receipts, one block.</em>
        </Fragment>
      ),
      body: 'Funds to the seller. Fees to protocol and middleman. Soulbound NFT plus two receipts — one block.',
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
