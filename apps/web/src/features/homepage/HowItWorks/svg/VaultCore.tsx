import styles from '../HowItWorks.module.scss';

/**
 * Smart-contract core — the "vault" at the center of the diagram.
 *
 * Layers (outer → inner):
 *   1. `core-halo`   — large glow disc, fill-opacity tweened up/down
 *                      across Fund/Deliver/Release phases.
 *   2. ring          — dashed outline, static.
 *   3. core disc     — solid gradient disc with padlock glyph.
 *   4. text labels   — "SMART CONTRACT" + "Escrow #4821".
 *
 * Commit 6 replaces the circular core with a hexagonal vault + internal
 * pending-balances chamber; until then this preserves the v7 render
 * byte-for-byte so snapshot tests stay green.
 */
export function VaultCore() {
  return (
    <g data-hiw="core">
      <circle
        data-hiw="core-halo"
        cx="600"
        cy="380"
        r="110"
        fill="#0091FF"
        fillOpacity="0"
        filter="url(#hiw-core-glow)"
        aria-hidden="true"
      />
      <circle
        cx="600"
        cy="380"
        r="85"
        fill="none"
        stroke="#0091FF"
        strokeOpacity=".5"
        strokeDasharray="4 5"
        vectorEffect="non-scaling-stroke"
        aria-hidden="true"
      />
      <circle
        cx="600"
        cy="380"
        r="60"
        fill="url(#hiw-core-grad)"
        stroke="#0091FF"
        strokeWidth="1"
      />
      <g
        transform="translate(600 380)"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="-14" y="-4" width="28" height="20" rx="3" />
        <path d="M -9 -4 V -10 A 9 9 0 0 1 9 -10 V -4" />
      </g>
      <text
        x="600"
        y="468"
        textAnchor="middle"
        className={styles.hiw__diagCoreLabel}
      >
        SMART CONTRACT
      </text>
      <text
        x="600"
        y="498"
        textAnchor="middle"
        className={styles.hiw__diagCoreTitle}
      >
        Escrow #4821
      </text>
    </g>
  );
}
