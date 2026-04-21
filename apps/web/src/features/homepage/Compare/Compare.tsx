import { CompareAnimations } from './CompareAnimations';
import { COMPARE_ROWS, type CompareStatus } from './rows';
import styles from './Compare.module.scss';

const STATUS_CLASS: Record<CompareStatus, string> = {
  ok: styles['compare__cell--ok'] ?? '',
  no: styles['compare__cell--no'] ?? '',
  mid: styles['compare__cell--mid'] ?? '',
};

export function Compare() {
  return (
    <section
      className={`o-section ${styles.compare}`}
      id="compare"
      aria-label="Compare Blue Escrow to existing options"
    >
      <CompareAnimations>
        <div className={styles.compare__wrap}>
          <div className={styles.compare__head}>
            <div>
              <div className={styles.compare__eyebrow} data-animate="eyebrow">
                Compared
              </div>
              <h2 className={styles.compare__heading} data-animate="heading">
                Old escrow held your money.{' '}
                <em className={styles.compare__emphasis}>We hold nothing.</em>
              </h2>
            </div>
            <p className={styles.compare__subtitle} data-animate="subtitle">
              Escrow.com takes a cut and can freeze your funds. A Telegram
              middleman takes a cut and can simply disappear. We removed the
              part where anyone has to be trusted.
            </p>
          </div>

          <div className={styles.compare__table} role="table" aria-label="Comparison table">
            <div
              className={styles.compare__headerCell}
              role="columnheader"
              data-animate="cell"
            >
              Criteria
            </div>
            <div
              className={styles.compare__headerCell}
              role="columnheader"
              data-animate="cell"
            >
              Escrow.com
            </div>
            <div
              className={styles.compare__headerCell}
              role="columnheader"
              data-animate="cell"
            >
              Telegram middleman
            </div>
            <div
              className={`${styles.compare__headerCell} ${styles['compare__headerCell--be']}`}
              role="columnheader"
              data-animate="cell"
            >
              Blue Escrow
            </div>

            {COMPARE_ROWS.map((row) => (
              <div key={row.criterion} className={styles.compare__rowGroup} role="row">
                <div
                  className={styles.compare__criterion}
                  role="rowheader"
                  data-animate="cell"
                >
                  {row.criterion}
                </div>
                <div
                  className={`${styles.compare__cell} ${STATUS_CLASS[row.escrow.status]}`}
                  role="cell"
                  data-animate="cell"
                >
                  {row.escrow.label}
                </div>
                <div
                  className={`${styles.compare__cell} ${STATUS_CLASS[row.telegram.status]}`}
                  role="cell"
                  data-animate="cell"
                >
                  {row.telegram.label}
                </div>
                <div
                  className={`${styles.compare__cell} ${styles['compare__cell--be']} ${STATUS_CLASS[row.blueEscrow.status]}`}
                  role="cell"
                  data-animate="cell"
                >
                  {row.blueEscrow.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CompareAnimations>
    </section>
  );
}
