import styles from '../HowItWorks.module.scss';

/**
 * Wires + decorative orbits around the contract core.
 *
 * Two layers per wire:
 *   - `wire-base-<C|M|S>` · always visible dashed path (CSS styled).
 *   - `wire-active-<C|M|S>` · opacity-tweened gradient overlay that
 *     lights up during the phase that involves that actor. Phase 12
 *     will also run a perpetual strokeDashoffset flow on the active
 *     wire; see HowItWorksAnimations.tsx.
 *
 * Orbits fade in at phase 0 (Meet) as ambient decoration.
 */
export function WireNetwork() {
  return (
    <>
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
    </>
  );
}
