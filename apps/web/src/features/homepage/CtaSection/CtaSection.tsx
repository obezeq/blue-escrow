import { CtaSectionAnimations } from './CtaSectionAnimations';
import { MagneticButton, Button } from '@/components/ui';
import styles from './CtaSection.module.scss';

// Bezier curve mirroring TheFlow's FlowTrail path — decorative echo
const TRAIL_D =
  'M 100 350 C 250 350, 350 250, 500 250 C 650 250, 750 350, 900 350';

export function CtaSection() {
  return (
    <section
      className={`o-section ${styles.cta}`}
      id="get-started"
      aria-label="Get started"
    >
      <CtaSectionAnimations>
        <div className={`o-container o-container--narrow ${styles.cta__content}`}>
          <h2 className={styles.cta__heading} data-animate="heading">
            Make it flow.
          </h2>

          <p className={styles.cta__subtitle} data-animate="subtitle">
            No signup. No email. Just your wallet.
          </p>

          <div className={styles.cta__buttons} data-animate="buttons">
            <MagneticButton
              variant="primary"
              size="lg"
              href="/app"
              data-cta="primary"
            >
              Connect Wallet
            </MagneticButton>
            <Button variant="secondary" size="lg" href="/docs">
              Read Documentation
            </Button>
          </div>
        </div>

        {/* Decorative FlowTrail echo — fully illuminated at low opacity */}
        <svg
          viewBox="0 0 1000 500"
          className={styles.cta__trailEcho}
          aria-hidden="true"
          data-animate="trail"
        >
          <defs>
            <linearGradient
              id="cta-trail-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.3)" />
            </linearGradient>
          </defs>
          <path
            d={TRAIL_D}
            stroke="url(#cta-trail-gradient)"
            strokeWidth={2}
            fill="none"
          />
        </svg>
      </CtaSectionAnimations>
    </section>
  );
}
