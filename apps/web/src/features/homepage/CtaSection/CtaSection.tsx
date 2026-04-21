import { CtaSectionAnimations } from './CtaSectionAnimations';
import { Button, MagneticButton } from '@/components/ui';
import styles from './CtaSection.module.scss';

export function CtaSection() {
  return (
    <section
      className={`o-section ${styles.closing}`}
      id="closing"
      aria-label="Get started"
    >
      <CtaSectionAnimations>
        <div className={styles.closing__wrap}>
          <div className={styles.closing__eyebrow} data-animate="eyebrow">
            <span>Ready when you are</span>
          </div>
          <h2 className={styles.closing__heading} data-animate="heading">
            Trade{' '}
            <em className={styles.closing__emphasis}>like you trust</em>{' '}
            the code, not the person.
          </h2>
          <div className={styles.closing__ctas} data-animate="ctas">
            <MagneticButton variant="primary" size="lg" href="/app">
              Open your first deal <span aria-hidden="true">→</span>
            </MagneticButton>
            <Button variant="secondary" size="lg" href="#hiw">
              See the flow
            </Button>
          </div>
        </div>
      </CtaSectionAnimations>
    </section>
  );
}
