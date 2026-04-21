import { TheProblemAnimations } from './TheProblemAnimations';
import styles from './TheProblem.module.scss';

export function TheProblem() {
  return (
    <section
      className={`o-section ${styles.problem}`}
      id="problem"
      aria-label="The problem with middlemen"
    >
      <TheProblemAnimations>
        <div className={styles.problem__wrap}>
          <div className={styles.problem__eyebrow} data-animate="eyebrow">
            The problem
          </div>

          <div className={styles.problem__lines}>
            <p className={styles.problem__line} data-animate="line">
              Two strangers online agree on a trade.
            </p>
            <p className={styles.problem__line} data-animate="line">
              <span className={styles.problem__highlight}>
                They use a middleman to hold the money.
              </span>
            </p>
            <p className={styles.problem__line} data-animate="line">
              The middleman is{' '}
              <span className={styles.problem__red}>a stranger too</span>.
            </p>
            <p className={styles.problem__line} data-animate="line">
              <span className={styles.problem__highlight}>
                Nothing stops them from{' '}
                <span className={styles.problem__italic}>just leaving.</span>
              </span>
            </p>
          </div>

          <div className={styles.problem__answer}>
            <div className={styles.problem__label} data-animate="fix">
              The fix
            </div>
            <div className={styles.problem__body} data-animate="fix">
              Keep the middleman — they&apos;re useful for judging deals.{' '}
              <b>Take the money out of their hands.</b> A smart contract holds
              it. The middleman only casts a vote.
            </div>
            <div className={styles.problem__note} data-animate="fix">
              <span>Middleman can:</span> verify the deal, break ties, resolve
              disputes.
              <br />
              <br />
              <span>Middleman cannot:</span> send funds to their own wallet.
              The smart contract simply doesn&apos;t have that function.
            </div>
          </div>
        </div>
      </TheProblemAnimations>
    </section>
  );
}
