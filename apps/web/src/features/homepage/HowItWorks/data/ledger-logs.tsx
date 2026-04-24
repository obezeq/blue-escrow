import { Fragment, type ReactNode } from 'react';

export interface LedgerLog {
  time: string;
  label: ReactNode;
  hash: string;
}

export const LEDGER_LOGS: LedgerLog[] = [
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
