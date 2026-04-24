import type { ReactNode } from 'react';

export type LedgerState = 'draft' | 'signed' | 'locked' | 'delivered' | 'released';

export type ActorId = 'client' | 'mid' | 'seller';
export type WireId = 'C' | 'M' | 'S';

export const PHASE_COUNT = 5;
export type PhaseIndex = 0 | 1 | 2 | 3 | 4;

export interface HiwChoreo {
  wiresActive: WireId[];
  packetFrom: 'client' | 'core' | null;
  packetTo: 'core' | 'seller' | null;
  amountTween?: { from: number; to: number };
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
