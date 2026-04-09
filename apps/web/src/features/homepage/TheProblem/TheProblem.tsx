import { TheProblemAnimations } from './TheProblemAnimations';
import styles from './TheProblem.module.scss';

export function TheProblem() {
  return (
    <section
      className={`o-section o-section--white ${styles.problem}`}
      id="the-problem"
      aria-label="The problem with trust"
    >
      <TheProblemAnimations>
        <div
          className={`o-container o-container--narrow ${styles.problem__content}`}
        >
          {/* Phase A: Kinetic text — single semantic h2, visual line breaks via spans */}
          <div className={styles.problem__kinetic} data-phase="kinetic">
            <h2 className={styles.problem__heading}>
              Every day,<br />
              someone trusts a stranger<br />
              with their money.
            </h2>
          </div>

          {/* Phase B: Impact stat */}
          <div className={styles.problem__impact} data-phase="impact">
            <p className={styles.problem__verdict} data-animate="verdict">And no one can stop it.</p>
            <p className={styles.problem__stat} aria-label="$2.1 billion">
              <span className={styles.problem__counter} data-animate="counter">$2.1B</span>
            </p>
            <p className={styles.problem__caption} data-animate="caption">
              lost to escrow and middleman fraud
            </p>
          </div>
        </div>
      </TheProblemAnimations>
    </section>
  );
}
