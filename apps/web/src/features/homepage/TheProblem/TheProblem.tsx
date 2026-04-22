import { TheProblemAnimations } from './TheProblemAnimations';
import styles from './TheProblem.module.scss';

export function TheProblem() {
  return (
    <section
      className={`o-section ${styles.problem}`}
      id="problem"
      aria-labelledby="problem-heading"
    >
      <h2 id="problem-heading" className="u-visually-hidden">
        The problem with middlemen
      </h2>
      <TheProblemAnimations>
        <div className={styles.problem__wrap}>
          <p className={styles.problem__eyebrow} data-animate="eyebrow">
            The problem
          </p>

          <div
            className={styles.problem__lines}
            role="group"
            aria-label="Problem statement"
          >
            <p className={styles.problem__line} data-animate="line">
              Two strangers online agree on a trade.
            </p>
            <p className={styles.problem__line} data-animate="line">
              <span className={styles.problem__highlight}>
                They use a{' '}
                <span data-animate="middleman-emphasis">middleman</span> to hold
                the money.
              </span>
            </p>
            <p className={styles.problem__line} data-animate="line">
              The middleman is{' '}
              <s className={styles.problem__struck} data-animate="stranger">
                <span
                  className={styles.problem__red}
                  aria-label="a stranger too, crossed out"
                >
                  a stranger too
                </span>
              </s>
              .
            </p>
            <p className={styles.problem__line} data-animate="line">
              <span className={styles.problem__highlight}>
                Nothing stops them from{' '}
                <em className={styles.problem__italic}>just leaving.</em>
              </span>
            </p>
          </div>

          <div className={styles.problem__answer}>
            <h3 className={styles.problem__label} data-animate="fix">
              The fix
            </h3>
            <p className={styles.problem__body} data-animate="fix">
              Keep the middleman — they&apos;re useful for judging deals.{' '}
              <strong>Take the money out of their hands.</strong> A smart
              contract holds it. The middleman only casts a vote.
            </p>
            <dl className={styles.problem__capabilities} data-animate="fix">
              <div className={styles.problem__capability}>
                <dt>Middleman can</dt>
                <dd>verify the deal, break ties, resolve disputes.</dd>
              </div>
              <div
                className={`${styles.problem__capability} ${styles['problem__capability--negative']}`}
              >
                <dt>Middleman cannot</dt>
                <dd>
                  send funds to their own wallet. The smart contract simply
                  doesn&apos;t have that function.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </TheProblemAnimations>
    </section>
  );
}
