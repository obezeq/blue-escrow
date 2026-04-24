import type { ReactNode } from 'react';
import styles from '../HowItWorks.module.scss';

export type ActorKind = 'client' | 'mid' | 'seller';

interface ActorGroupProps {
  kind: ActorKind;
  x: number;
  y: number;
  role: string;
  name: string;
  meta: string;
  /**
   * The glyph drawn inside the puck. Keep stroke/fill identical to the
   * v7 render: stroke="#0091FF", strokeWidth="1.6", fill="none" on the
   * parent <g>. Only the path `d` attributes differ per actor.
   */
  glyph: ReactNode;
}

/**
 * One party puck (Client / Middleman / Seller). v8 commit 5 promotes the
 * middleman out of this component into a JudgePodium with its own
 * elevated geometry — this component then owns only Client + Seller.
 */
export function ActorGroup({ kind, x, y, role, name, meta, glyph }: ActorGroupProps) {
  return (
    <g
      data-hiw={`actor-${kind}`}
      transform={`translate(${x} ${y})`}
      opacity="0"
    >
      <circle r="56" className={styles.hiw__diagActorPuck} strokeWidth="1" />
      <circle
        r="66"
        fill="none"
        stroke="#0091FF"
        strokeOpacity=".3"
        strokeDasharray="2 5"
        vectorEffect="non-scaling-stroke"
        aria-hidden="true"
      />
      <g
        stroke="#0091FF"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {glyph}
      </g>
      <text
        y="-92"
        textAnchor="middle"
        className={styles.hiw__diagActorRole}
      >
        {role}
      </text>
      <text y="100" textAnchor="middle" className={styles.hiw__diagActorText}>
        {name}
      </text>
      <text
        y="132"
        textAnchor="middle"
        className={styles.hiw__diagActorMuted}
      >
        {meta}
      </text>
    </g>
  );
}

export const CLIENT_GLYPH = (
  <path d="M 0 -16 L -14 -8 V 6 C -14 16 -8 22 0 24 C 8 22 14 16 14 6 V -8 Z" />
);

export const MIDDLEMAN_GLYPH = (
  <>
    <path d="M 0 -18 L 16 -10 V 8 L 0 20 L -16 8 V -10 Z" />
    <path d="M -16 -2 L 16 -2" />
  </>
);

export const SELLER_GLYPH = (
  <>
    <path d="M -14 -12 H 14 L 18 14 A 2 2 0 0 1 16 16 H -16 A 2 2 0 0 1 -18 14 Z" />
    <path d="M -6 -12 V -18 A 6 6 0 0 1 6 -18 V -12" />
  </>
);
