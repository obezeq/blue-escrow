import styles from '../HowItWorks.module.scss';

/**
 * Middleman judge-podium — replaces the v7 symmetric `actor-mid` puck.
 *
 * Visual hierarchy: the middleman sits on a raised dais with a
 * hexagonal badge and a gavel glyph, signalling *referee*, not
 * counterparty. A sticky pill below the name reads "Can vote · Cannot
 * withdraw" — the single strongest anti-confusion signal for Web3 users.
 *
 * Two-layer opacity contract:
 *   - Outer `<g data-hiw="judge" opacity="0">`
 *       · Owned by GSAP. Tweened 0 → 1 during the Meet phase just like
 *         the original actor-mid. Happy-path cleanup seeds it back.
 *   - Inner `.hiw__diagJudgeBody`
 *       · Owned by CSS. `opacity: var(--hiw-judge-opacity, 0.30)`.
 *         Kept dim on the happy path (referee is on standby). Dispute
 *         branch timelines lift the var to 1.0 — see commit 9.
 *
 * Keeping the two opacities multiplicative means GSAP only needs to
 * care about entrance/exit; the branch never fights the scrub.
 */
export function JudgePodium() {
  return (
    <g
      data-hiw="actor-mid"
      data-hiw-role="judge"
      transform="translate(600 120)"
      opacity="0"
    >
      <g className={styles.hiw__diagJudgeBody}>
        {/* Elevated dais beneath the badge — two layered trapezoids for
            a shallow perspective suggestion. Dashed top edge nods to
            the wire system without stealing attention. */}
        <g
          className={styles.hiw__diagJudgePodium}
          aria-hidden="true"
        >
          <path d="M -62 60 L 62 60 L 80 84 L -80 84 Z" />
          <path
            d="M -52 60 L 52 60"
            strokeDasharray="4 5"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* Hexagonal badge — flat-top hex radius 56 centered at (0,0)
            to match the actor puck radius so the horizontal axis of
            the diagram stays visually balanced. */}
        <polygon
          className={styles.hiw__diagJudgeHex}
          points="56,0 28,-48.5 -28,-48.5 -56,0 -28,48.5 28,48.5"
          strokeWidth="1"
        />

        {/* Gavel + strike block — paths scoped inside a rotated group so
            the head reads as angled, not upright. */}
        <g className={styles.hiw__diagJudgeGavel} aria-hidden="true">
          <g transform="rotate(-20)">
            <rect x="-18" y="-22" width="26" height="10" rx="2" />
            <rect x="-2" y="-14" width="4" height="28" rx="1.5" />
          </g>
          <rect
            className={styles.hiw__diagJudgeGavelBlock}
            x="-18"
            y="18"
            width="36"
            height="4"
            rx="1"
          />
        </g>

        {/* Scales-of-justice accents — two short arcs flanking the hex
            at y=0, echoing the dashed orbits without introducing a new
            stroke weight. */}
        <g
          className={styles.hiw__diagJudgeScales}
          aria-hidden="true"
        >
          <path d="M -82 -4 A 18 18 0 0 1 -58 -4" />
          <path d="M 58 -4 A 18 18 0 0 1 82 -4" />
        </g>

        {/* Role label — same y-offset as the actor pucks so the CLIENT /
            MIDDLEMAN / SELLER trio reads on one baseline. */}
        <text
          y="-92"
          textAnchor="middle"
          className={styles.hiw__diagActorRole}
        >
          MIDDLEMAN
        </text>
        <text y="100" textAnchor="middle" className={styles.hiw__diagActorText}>
          @archer
        </text>
        <text
          y="132"
          textAnchor="middle"
          className={styles.hiw__diagActorMuted}
        >
          REP 4.98 · 214 deals
        </text>

        {/* Sticky role chip — the load-bearing signal for this whole
            redesign. Short, monospaced, two-column with a · separator
            so the negative claim ("cannot withdraw") gets equal read
            weight to the positive ("can vote"). */}
        <g transform="translate(0 160)">
          <rect
            className={styles.hiw__diagJudgeChip}
            x="-112"
            y="-14"
            width="224"
            height="28"
            rx="14"
          />
          <text
            y="5"
            textAnchor="middle"
            className={styles.hiw__diagJudgeChipLabel}
          >
            Can vote · Cannot withdraw
          </text>
        </g>
      </g>
    </g>
  );
}
