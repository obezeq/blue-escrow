import { TheSolutionAnimations } from './TheSolutionAnimations';
import styles from './TheSolution.module.scss';

export function TheSolution() {
  return (
    <section
      className={`o-section o-section--white ${styles.solution}`}
      id="the-solution"
      aria-label="How your money is protected"
    >
      <TheSolutionAnimations>
        <div
          className={`o-container o-container--narrow ${styles.solution__content}`}
        >
          {/* Phase A: Section heading — persists through Phases B-D */}
          <h2 className={styles.solution__heading} data-persist="heading">
            Nobody holds the key.
          </h2>

          {/* Lock phases — cross-fade in the area below the heading */}
          <div className={styles.solution__locks} data-region="locks">
            {/* Phase B: Buyer */}
            <div className={styles.solution__phase} data-phase="buyer">
              <p className={styles.solution__text}>
                Your money goes into a smart contract.
              </p>
              <p className={styles.solution__text}>
                Not a person. Not a company.
              </p>
              <p className={styles.solution__text}>
                A program on the blockchain that no one can change.
              </p>
            </div>

            {/* Phase C: Seller */}
            <div className={styles.solution__phase} data-phase="seller">
              <p className={styles.solution__text}>
                You deliver. The smart contract releases your payment.
              </p>
              <p className={styles.solution__text}>No chasing. No hoping.</p>
            </div>

            {/* Phase D: Middleman */}
            <div className={styles.solution__phase} data-phase="middleman">
              <p className={styles.solution__text}>
                The middleman resolves disputes.
              </p>
              <p className={styles.solution__text}>
                But the money? Only the smart contract can move it.
              </p>
            </div>
          </div>

          {/* Phase E: Closing — replaces heading + locks */}
          <div className={styles.solution__closingWrap} data-phase="closing">
            <p className={styles.solution__closing}>
              Protected by the blockchain. Not by promises.
            </p>
          </div>
        </div>
      </TheSolutionAnimations>
    </section>
  );
}
