import styles from './HowItWorks.module.scss';

export function HiwDiagram() {
  return (
    <svg
      className={styles.hiw__svg}
      viewBox="0 0 1200 720"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby="hiw-diag-title hiw-diag-desc"
    >
      <title id="hiw-diag-title">Three-party escrow smart contract diagram</title>
      <desc id="hiw-diag-desc">
        A central smart-contract core holds funds. Client, middleman, and
        seller are three wallets, each connected to the core by dashed wires
        that glow when a phase activates them. A money packet flows from the
        client to the core when the deal is locked, then from the core to the
        seller when funds are released.
      </desc>

      <defs>
        <radialGradient id="hiw-core-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#33AAFF" />
          <stop offset="60%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#001B4D" />
        </radialGradient>
        <filter
          id="hiw-core-glow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="hiw-wire-grad" x1="0" x2="1">
          <stop offset="0" stopColor="#0091FF" stopOpacity="0" />
          <stop offset=".5" stopColor="#0091FF" />
          <stop offset="1" stopColor="#0091FF" stopOpacity="0" />
        </linearGradient>
        <filter
          id="hiw-packet-trail"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="0" />
        </filter>
        <filter
          id="hiw-core-rim"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="0" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.67  0 0 0 0 1  0 0 0 1 0" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Concentric orbits around the contract core — decorative. */}
      <g data-hiw="orbits" opacity="0" aria-hidden="true">
        <circle
          cx="600"
          cy="380"
          r="180"
          fill="none"
          stroke="#0091FF"
          strokeOpacity=".15"
          strokeDasharray="2 6"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx="600"
          cy="380"
          r="260"
          fill="none"
          stroke="#0091FF"
          strokeOpacity=".1"
          strokeDasharray="2 8"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx="600"
          cy="380"
          r="340"
          fill="none"
          stroke="#0091FF"
          strokeOpacity=".07"
          strokeDasharray="2 10"
          vectorEffect="non-scaling-stroke"
        />
      </g>

      {/* Wires — base dashed (always visible) + active gradient overlays (tweened) */}
      <g strokeLinecap="round" fill="none" strokeWidth="1.5" aria-hidden="true">
        <path
          data-hiw="wire-base-C"
          className={styles.hiw__diagWire}
          d="M 260 420 Q 420 420 540 400"
          strokeDasharray="5 6"
        />
        <path
          data-hiw="wire-base-M"
          className={styles.hiw__diagWire}
          d="M 600 180 Q 600 280 600 340"
          strokeDasharray="5 6"
        />
        <path
          data-hiw="wire-base-S"
          className={styles.hiw__diagWire}
          d="M 940 420 Q 780 420 660 400"
          strokeDasharray="5 6"
        />

        <path
          data-hiw="wire-active-C"
          d="M 260 420 Q 420 420 540 400"
          stroke="url(#hiw-wire-grad)"
          strokeWidth="2"
          opacity="0"
        />
        <path
          data-hiw="wire-active-M"
          d="M 600 180 Q 600 280 600 340"
          stroke="url(#hiw-wire-grad)"
          strokeWidth="2"
          opacity="0"
        />
        <path
          data-hiw="wire-active-S"
          d="M 940 420 Q 780 420 660 400"
          stroke="url(#hiw-wire-grad)"
          strokeWidth="2"
          opacity="0"
        />
      </g>

      {/* Contract core */}
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

      {/* CLIENT actor */}
      <g data-hiw="actor-client" transform="translate(180 420)" opacity="0">
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
          <path d="M 0 -16 L -14 -8 V 6 C -14 16 -8 22 0 24 C 8 22 14 16 14 6 V -8 Z" />
        </g>
        <text
          y="-92"
          textAnchor="middle"
          className={styles.hiw__diagActorRole}
        >
          CLIENT
        </text>
        <text
          y="100"
          textAnchor="middle"
          className={styles.hiw__diagActorText}
        >
          Sofia R.
        </text>
        <text
          y="132"
          textAnchor="middle"
          className={styles.hiw__diagActorMuted}
        >
          0x7a2f…e91c
        </text>
      </g>

      {/* MIDDLEMAN actor */}
      <g data-hiw="actor-mid" transform="translate(600 120)" opacity="0">
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
          <path d="M 0 -18 L 16 -10 V 8 L 0 20 L -16 8 V -10 Z" />
          <path d="M -16 -2 L 16 -2" />
        </g>
        <text
          y="-92"
          textAnchor="middle"
          className={styles.hiw__diagActorRole}
        >
          MIDDLEMAN
        </text>
        <text
          y="100"
          textAnchor="middle"
          className={styles.hiw__diagActorText}
        >
          @archer
        </text>
        <text
          y="132"
          textAnchor="middle"
          className={styles.hiw__diagActorMuted}
        >
          REP 4.98 · 214 deals
        </text>
      </g>

      {/* SELLER actor */}
      <g data-hiw="actor-seller" transform="translate(1020 420)" opacity="0">
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
          <path d="M -14 -12 H 14 L 18 14 A 2 2 0 0 1 16 16 H -16 A 2 2 0 0 1 -18 14 Z" />
          <path d="M -6 -12 V -18 A 6 6 0 0 1 6 -18 V -12" />
        </g>
        <text
          y="-92"
          textAnchor="middle"
          className={styles.hiw__diagActorRole}
        >
          SELLER
        </text>
        <text
          y="100"
          textAnchor="middle"
          className={styles.hiw__diagActorText}
        >
          Diego M.
        </text>
        <text
          y="132"
          textAnchor="middle"
          className={styles.hiw__diagActorMuted}
        >
          0xd20e…77ab
        </text>
      </g>

      {/* Money packet — position tweened by the timeline (GSAP seeds via gsap.set) */}
      <g data-hiw="packet" opacity="0" filter="url(#hiw-packet-trail)">
        <rect
          x="-28"
          y="-14"
          width="56"
          height="28"
          rx="14"
          fill="#fff"
          stroke="#0091FF"
          strokeWidth="1.5"
        />
        <text
          textAnchor="middle"
          y="5"
          fill="#001B4D"
          className={styles.hiw__diagPacket}
        >
          $2,400
        </text>
      </g>
    </svg>
  );
}
