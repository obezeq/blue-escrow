// Compare table data — verbatim from v6 Blue Escrow v6.html:1543-1571.
// Status dots follow v6 class names: ok (green), no (red), mid (neutral).

export type CompareStatus = 'ok' | 'no' | 'mid';

export interface CompareCell {
  label: string;
  status: CompareStatus;
}

export interface CompareRow {
  criterion: string;
  escrow: CompareCell;
  telegram: CompareCell;
  blueEscrow: CompareCell;
}

export const COMPARE_ROWS: CompareRow[] = [
  {
    criterion: 'Who holds the money',
    escrow: { label: 'A private company', status: 'no' },
    telegram: { label: 'A stranger online', status: 'no' },
    blueEscrow: { label: 'A smart contract', status: 'ok' },
  },
  {
    criterion: 'Can they steal it?',
    escrow: { label: 'Freeze yes, steal rare', status: 'mid' },
    telegram: { label: 'Easily, no consequence', status: 'no' },
    blueEscrow: { label: 'Not in the code', status: 'ok' },
  },
  {
    criterion: 'Public record',
    escrow: { label: 'Private, centralized', status: 'mid' },
    telegram: { label: 'None', status: 'no' },
    blueEscrow: { label: 'Permanent, on-chain', status: 'ok' },
  },
  {
    criterion: 'Verifiable reputation',
    escrow: { label: 'N/A', status: 'no' },
    telegram: { label: 'Manipulable reviews', status: 'no' },
    blueEscrow: { label: 'Soulbound NFTs', status: 'ok' },
  },
  {
    criterion: 'Works worldwide',
    escrow: { label: 'Geographic limits', status: 'no' },
    telegram: { label: 'At your own risk', status: 'mid' },
    blueEscrow: { label: 'Anywhere USDC works', status: 'ok' },
  },
  {
    criterion: 'Protocol fee',
    escrow: { label: '0.89 – 3.25%', status: 'mid' },
    telegram: { label: 'Informal, negotiated', status: 'mid' },
    blueEscrow: { label: '0.33% flat', status: 'ok' },
  },
];
