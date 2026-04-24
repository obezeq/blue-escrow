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
              <p className={styles.compare__eyebrow} data-animate="eyebrow">
                Compared
              </p>
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

          <table
            className={styles.compare__table}
            aria-label="Comparison table"
          >
            <thead>
              <tr className={styles.compare__headerRow}>
                <th
                  scope="col"
                  className={styles.compare__headerCell}
                  data-animate="cell"
                >
                  Criteria
                </th>
                <th
                  scope="col"
                  className={styles.compare__headerCell}
                  data-animate="cell"
                >
                  Escrow.com
                </th>
                <th
                  scope="col"
                  className={styles.compare__headerCell}
                  data-animate="cell"
                >
                  Telegram middleman
                </th>
                <th
                  scope="col"
                  className={`${styles.compare__headerCell} ${styles['compare__headerCell--be']}`}
                  data-animate="cell"
                >
                  Blue Escrow
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.criterion} className={styles.compare__rowGroup}>
                  <th
                    scope="row"
                    className={styles.compare__criterion}
                    data-animate="cell"
                  >
                    {row.criterion}
                  </th>
                  <td
                    className={`${styles.compare__cell} ${STATUS_CLASS[row.escrow.status]}`}
                    data-animate="cell"
                  >
                    {row.escrow.label}
                  </td>
                  <td
                    className={`${styles.compare__cell} ${STATUS_CLASS[row.telegram.status]}`}
                    data-animate="cell"
                  >
                    {row.telegram.label}
                  </td>
                  <td
                    className={`${styles.compare__cell} ${styles['compare__cell--be']} ${STATUS_CLASS[row.blueEscrow.status]}`}
                    data-animate="cell"
                  >
                    {row.blueEscrow.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CompareAnimations>
    </section>
  );
}
