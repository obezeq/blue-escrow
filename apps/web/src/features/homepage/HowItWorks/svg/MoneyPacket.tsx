import styles from '../HowItWorks.module.scss';

/**
 * Money packet animated along the MotionPath set by the master timeline.
 * GSAP owns its transform — never set translate() inline here, or scrub-
 * back would fight the tween.
 */
export function MoneyPacket() {
  return (
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
  );
}
