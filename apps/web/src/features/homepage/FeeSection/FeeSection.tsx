import { FeeSectionAnimations } from './FeeSectionAnimations';
import styles from './FeeSection.module.scss';

export function FeeSection() {
  return (
    <section
      className={`o-section ${styles.fee}`}
      id="fees"
      aria-label="Platform fees"
    >
      <FeeSectionAnimations>
        <div className={`o-container o-container--narrow ${styles.fee__content}`}>
          <p
            className={styles.fee__number}
            data-animate="fee-number"
            aria-label="0.33 percent"
          >
            0.33%
          </p>

          <div className={styles.fee__comparison} data-animate="comparison">
            <p className={styles.fee__line}>
              No hidden fees. No surprises. No geographic restrictions.
            </p>
            <p className={styles.fee__competitor}>
              Escrow.com charges 0.89%&nbsp;&mdash;&nbsp;3.25%. We charge{' '}
              <span className={styles.fee__highlight}>0.33%</span>. Flat.
            </p>
          </div>
        </div>
      </FeeSectionAnimations>
    </section>
  );
}
