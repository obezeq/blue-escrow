// v6 FAQ copy (Blue Escrow v6.html:1731-1736) — kept verbatim.
// <strong> marks the phrases rendered with increased contrast (<b> in v6).

export interface FaqItem {
  count: string;
  question: string;
  answer: React.ReactNode;
}

import type { ReactNode } from 'react';

export const FAQ_ITEMS: { count: string; question: string; answer: ReactNode }[] = [
  {
    count: '01',
    question: "So the middleman is just a human who can't steal?",
    answer: (
      <>
        Exactly. <b>They still matter</b> — they judge the deal, break ties, resolve disputes. What they lose is access to the funds. The contract routes money only to client or freelancer. Not to the middleman&apos;s wallet for custody. That function doesn&apos;t exist in the code.
      </>
    ),
  },
  {
    count: '02',
    question: 'How does the middleman get paid?',
    answer: (
      <>
        Their fee is set when the deal is signed — typically 1 to 3%. At release, the contract deducts it and sends it <b>directly to the middleman&apos;s wallet</b>. Paid by code, not by the client. No invoicing, no chasing.
      </>
    ),
  },
  {
    count: '03',
    question: 'What if a party goes silent?',
    answer: (
      <>
        Every deal has a configurable timer (default 33 days). If the client never confirms, the middleman rules. If the middleman also goes silent, the <b>timeout fires</b> and funds route per the contract&apos;s default state. No one can stall forever.
      </>
    ),
  },
  {
    count: '04',
    question: 'How is reputation verifiable?',
    answer: (
      <>
        Each resolved deal mints a <b>soulbound NFT</b> to the middleman&apos;s wallet — non-transferable, permanent, outcome attached. You can&apos;t buy it, sell it, or fake it. Anyone can inspect a middleman&apos;s history before choosing them.
      </>
    ),
  },
  {
    count: '05',
    question: 'Why USDC and not dollars?',
    answer: (
      <>
        USDC is a dollar — backed 1:1 by Circle, redeemable for USD. The difference: it moves in seconds to any wallet on Earth, no bank in the middle. You can off-ramp to a normal account whenever you want.
      </>
    ),
  },
  {
    count: '06',
    question: 'Is the contract actually safe?',
    answer: (
      <>
        Open-source. Built on OpenZeppelin standards. <b>Immutable</b> — not even we can edit it. A bank can freeze your account; a platform can suspend you. The contract can&apos;t. It only knows how to route funds to the two wallets it was told about.
      </>
    ),
  },
];
