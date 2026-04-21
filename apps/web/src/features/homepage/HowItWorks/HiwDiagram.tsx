import styles from './HowItWorks.module.scss';

/**
 * v6 HIW SVG diagram (Blue Escrow v6.html:1390-1483) —
 * contract core + 3 actor pucks + 3 base dashed wires + 3 active gradient
 * overlays + money packet. Every animated sub-element is data-tagged so
 * HowItWorksAnimations can target it without leaking ids into the DOM.
 *
 * viewBox 0 0 1200 720 matches the v6 coordinate system; actor + core
 * positions are defined in steps.tsx so the GSAP timeline can reference
 * them programmatically.
 */
export function HiwDiagram() {
  return (
    <svg
      className={styles.hiw__svg}
      viewBox="0 0 1200 720"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
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
      </defs>

      {/* Concentric orbits around contract core */}
      <g data-hiw="orbits" opacity="0">
        <circle
          cx="600"
          cy="380"
          r="180"
          fill="none"
          stroke="#0091FF"
          strokeOpacity=".15"
          strokeDasharray="2 6"
        />
        <circle
          cx="600"
          cy="380"
          r="260"
          fill="none"
          stroke="#0091FF"
          strokeOpacity=".1"
          strokeDasharray="2 8"
        />
        <circle
          cx="600"
          cy="380"
          r="340"
          fill="none"
          stroke="#0091FF"
          strokeOpacity=".07"
          strokeDasharray="2 10"
        />
      </g>

      {/* Wires — base dashed (always visible) + active gradient overlays (tweened) */}
      <g strokeLinecap="round" fill="none" strokeWidth="1.5">
        <path
          data-hiw="wire-base-C"
          d="M 260 420 Q 420 420 540 400"
          stroke="#213B78"
          strokeDasharray="5 6"
        />
        <path
          data-hiw="wire-base-M"
          d="M 600 180 Q 600 280 600 340"
          stroke="#213B78"
          strokeDasharray="5 6"
        />
        <path
          data-hiw="wire-base-S"
          d="M 940 420 Q 780 420 660 400"
          stroke="#213B78"
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
        />
        <circle
          cx="600"
          cy="380"
          r="85"
          fill="none"
          stroke="#0091FF"
          strokeOpacity=".5"
          strokeDasharray="4 5"
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
        >
          <rect x="-14" y="-4" width="28" height="20" rx="3" />
          <path d="M -9 -4 V -10 A 9 9 0 0 1 9 -10 V -4" />
        </g>
        <text
          x="600"
          y="460"
          textAnchor="middle"
          fontFamily="Geist Mono, ui-monospace"
          fontSize="11"
          fill="#7B88B0"
          letterSpacing="2"
        >
          SMART CONTRACT
        </text>
        <text
          x="600"
          y="478"
          textAnchor="middle"
          fontFamily="Geist, ui-sans-serif"
          fontSize="13"
          fill="#F3F6FF"
        >
          Escrow #4821
        </text>
      </g>

      {/* CLIENT actor */}
      <g data-hiw="actor-client" transform="translate(180 420)" opacity="0">
        <circle r="56" fill="#071230" stroke="#213B78" strokeWidth="1" />
        <circle
          r="66"
          fill="none"
          stroke="#0091FF"
          strokeOpacity=".3"
          strokeDasharray="2 5"
        />
        <g
          stroke="#0091FF"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 0 -16 L -14 -8 V 6 C -14 16 -8 22 0 24 C 8 22 14 16 14 6 V -8 Z" />
        </g>
        <text
          y="-82"
          textAnchor="middle"
          fontFamily="Geist Mono, ui-monospace"
          fontSize="10"
          fill="#0091FF"
          letterSpacing="2"
        >
          CLIENT
        </text>
        <text
          y="88"
          textAnchor="middle"
          fontFamily="Geist, ui-sans-serif"
          fontSize="14"
          fill="#F3F6FF"
        >
          Sofia R.
        </text>
        <text
          y="106"
          textAnchor="middle"
          fontFamily="Geist Mono, ui-monospace"
          fontSize="10"
          fill="#7B88B0"
        >
          0x7a2f…e91c
        </text>
      </g>

      {/* MIDDLEMAN actor */}
      <g data-hiw="actor-mid" transform="translate(600 120)" opacity="0">
        <circle r="56" fill="#071230" stroke="#213B78" strokeWidth="1" />
        <circle
          r="66"
          fill="none"
          stroke="#0091FF"
          strokeOpacity=".3"
          strokeDasharray="2 5"
        />
        <g
          stroke="#0091FF"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 0 -18 L 16 -10 V 8 L 0 20 L -16 8 V -10 Z" />
          <path d="M -16 -2 L 16 -2" />
        </g>
        <text
          y="-82"
          textAnchor="middle"
          fontFamily="Geist Mono, ui-monospace"
          fontSize="10"
          fill="#0091FF"
          letterSpacing="2"
        >
          MIDDLEMAN
        </text>
        <text
          y="88"
          textAnchor="middle"
          fontFamily="Geist, ui-sans-serif"
          fontSize="14"
          fill="#F3F6FF"
        >
          @archer
        </text>
        <text
          y="106"
          textAnchor="middle"
          fontFamily="Geist Mono, ui-monospace"
          fontSize="10"
          fill="#7B88B0"
        >
          REP 4.98 · 214 deals
        </text>
      </g>

      {/* SELLER actor */}
      <g data-hiw="actor-seller" transform="translate(1020 420)" opacity="0">
        <circle r="56" fill="#071230" stroke="#213B78" strokeWidth="1" />
        <circle
          r="66"
          fill="none"
          stroke="#0091FF"
          strokeOpacity=".3"
          strokeDasharray="2 5"
        />
        <g
          stroke="#0091FF"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M -14 -12 H 14 L 18 14 A 2 2 0 0 1 16 16 H -16 A 2 2 0 0 1 -18 14 Z" />
          <path d="M -6 -12 V -18 A 6 6 0 0 1 6 -18 V -12" />
        </g>
        <text
          y="-82"
          textAnchor="middle"
          fontFamily="Geist Mono, ui-monospace"
          fontSize="10"
          fill="#0091FF"
          letterSpacing="2"
        >
          SELLER
        </text>
        <text
          y="88"
          textAnchor="middle"
          fontFamily="Geist, ui-sans-serif"
          fontSize="14"
          fill="#F3F6FF"
        >
          Diego M.
        </text>
        <text
          y="106"
          textAnchor="middle"
          fontFamily="Geist Mono, ui-monospace"
          fontSize="10"
          fill="#7B88B0"
        >
          0xd20e…77ab
        </text>
      </g>

      {/* Money packet — position tweened by the timeline */}
      <g data-hiw="packet" opacity="0" transform="translate(180 420)">
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
          fontFamily="Geist Mono, ui-monospace"
          fontSize="11"
          fill="#001B4D"
          fontWeight="700"
        >
          $2,400
        </text>
      </g>
    </svg>
  );
}
