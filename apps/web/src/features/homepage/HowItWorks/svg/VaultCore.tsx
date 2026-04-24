import coreStyles from '../HowItWorks.module.scss';
import styles from './hiw-svg.module.scss';

/**
 * Smart-contract core rendered as a hexagonal **vault** with an inner
 * chamber, a padlock glyph, three dashed output spouts (client, seller,
 * platform/middleman), and three pending-balance **buckets** that reveal
 * during the Settle phase.
 *
 * Data-attribute contract preserved so the existing HowItWorksAnimations
 * tween plumbing keeps working byte-for-byte:
 *   - `[data-hiw="core"]`         outer group (halo-fade tween target)
 *   - `[data-hiw="core-halo"]`    halo circle (fillOpacity tween)
 *   - `[data-hiw="core-chamber"]` inner hex — new in v8, consumed by
 *                                  `--hiw-vault-charge` CSS var for the
 *                                  empty → charged transition
 *   - `[data-hiw="vault-bucket-<seller|middleman|platform>"]` per-payee
 *                                  pending-balance slots, hidden at rest
 *   - `[data-hiw="vault-withdraw-cue"]` footnote-style cue that reads
 *                                  "Each party pulls via withdraw()"
 *
 * The buckets and withdraw cue start with `opacity: 0`; commit 12 wires
 * the GSAP tweens that raise them during the fee-split cinematic.
 */
export function VaultCore() {
  return (
    <g data-hiw="core">
      {/* Soft radial glow — fillOpacity tweened by the master timeline */}
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

      {/* Decorative dashed ring preserved from v7 for continuity */}
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

      {/* Outer hex shell — reads as "vault" surface */}
      <polygon
        points="660,380 630,430 570,430 540,380 570,330 630,330"
        className={styles.hiw__diagVaultHex}
      />

      {/* Inner chamber fill — opacity/fill driven by --hiw-vault-charge
          so the vault visibly "fills" during the Fund phase */}
      <polygon
        data-hiw="core-chamber"
        points="652,380 624,424 576,424 548,380 576,336 624,336"
        className={styles.hiw__diagVaultChamber}
      />

      {/* Gradient core disc — v7 signature glow, now inside the hex */}
      <circle
        cx="600"
        cy="380"
        r="42"
        fill="url(#hiw-core-grad)"
        stroke="#0091FF"
        strokeWidth="1"
      />

      {/* Padlock glyph — rendered with stroke-only tokens via the
          shared padlock class so forced-colors inherits --text */}
      <g
        className={styles.hiw__diagVaultPadlock}
        transform="translate(600 380)"
        aria-hidden="true"
      >
        <rect x="-11" y="-3" width="22" height="16" rx="2.5" />
        <path d="M -7 -3 V -8 A 7 7 0 0 1 7 -8 V -3" />
      </g>

      {/* Output spouts — dashed channels pointing toward each recipient
          side. Stay dim until the Settle phase lights them up. */}
      <g aria-hidden="true">
        <path
          data-hiw="spout-client"
          d="M 540 380 L 470 380"
          className={styles.hiw__diagVaultSpout}
        />
        <path
          data-hiw="spout-seller"
          d="M 660 380 L 730 380"
          className={styles.hiw__diagVaultSpout}
        />
        <path
          data-hiw="spout-platform"
          d="M 600 430 L 600 500"
          className={styles.hiw__diagVaultSpout}
        />
      </g>

      {/* Pending-balances buckets — three slot pills laid out below the
          vault (settle phase). Each starts opacity 0 so snapshot-style
          happy-path tests see the same visual as pre-redesign until the
          timeline seeds them. */}
      <g data-hiw="vault-bucket-seller" className={styles.hiw__diagVaultBucket}>
        <rect
          x="455"
          y="555"
          width="100"
          height="42"
          rx="10"
          className={styles.hiw__diagVaultBucketPill}
        />
        <text
          x="505"
          y="574"
          textAnchor="middle"
          className={styles.hiw__diagVaultBucketLabel}
        >
          SELLER
        </text>
        <text
          x="505"
          y="590"
          textAnchor="middle"
          className={styles.hiw__diagVaultBucketAmount}
        >
          2,344.08
        </text>
      </g>

      <g data-hiw="vault-bucket-middleman" className={styles.hiw__diagVaultBucket}>
        <rect
          x="560"
          y="555"
          width="100"
          height="42"
          rx="10"
          className={styles.hiw__diagVaultBucketPill}
        />
        <text
          x="610"
          y="574"
          textAnchor="middle"
          className={styles.hiw__diagVaultBucketLabel}
        >
          MIDDLEMAN
        </text>
        <text
          x="610"
          y="590"
          textAnchor="middle"
          className={styles.hiw__diagVaultBucketAmount}
        >
          48.00
        </text>
      </g>

      <g data-hiw="vault-bucket-platform" className={styles.hiw__diagVaultBucket}>
        <rect
          x="665"
          y="555"
          width="100"
          height="42"
          rx="10"
          className={styles.hiw__diagVaultBucketPill}
        />
        <text
          x="715"
          y="574"
          textAnchor="middle"
          className={styles.hiw__diagVaultBucketLabel}
        >
          PLATFORM
        </text>
        <text
          x="715"
          y="590"
          textAnchor="middle"
          className={styles.hiw__diagVaultBucketAmount}
        >
          7.92
        </text>
      </g>

      {/* "SMART CONTRACT / Escrow #4821" labels preserved from v7 */}
      <text
        x="600"
        y="468"
        textAnchor="middle"
        className={coreStyles.hiw__diagCoreLabel}
      >
        SMART CONTRACT
      </text>
      <text
        x="600"
        y="498"
        textAnchor="middle"
        className={coreStyles.hiw__diagCoreTitle}
      >
        Escrow #4821
      </text>

      {/* Pull-based withdraw cue — footnote-scale reminder that every
          recipient has to call withdraw() themselves. Stays hidden until
          the Settle → Payout tail of the master timeline. */}
      <text
        data-hiw="vault-withdraw-cue"
        x="600"
        y="624"
        textAnchor="middle"
        className={styles.hiw__diagVaultWithdrawCue}
      >
        EACH PARTY PULLS VIA withdraw()
      </text>
    </g>
  );
}
