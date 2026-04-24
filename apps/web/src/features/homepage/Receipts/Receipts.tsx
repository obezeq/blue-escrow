import { ReceiptsAnimations } from './ReceiptsAnimations';
import { RECEIPTS_CARDS, type ReceiptVariant } from './cards';
import styles from './Receipts.module.scss';

const VARIANT_CLASS: Record<ReceiptVariant, string> = {
  soul: styles['receipts__card--soul'] ?? '',
  client: styles['receipts__card--client'] ?? '',
  seller: styles['receipts__card--seller'] ?? '',
};

export function Receipts() {
  return (
    <section
      className={`o-section ${styles.receipts}`}
      id="receipts"
      aria-label="On-chain receipts minted per deal"
    >
      <ReceiptsAnimations>
        <div className={styles.receipts__wrap}>
          <div className={styles.receipts__head}>
            <div>
              <p
                className={styles.receipts__eyebrow}
                data-animate="eyebrow"
              >
                Receipts
              </p>
              <h2 className={styles.receipts__heading} data-animate="heading">
                Every deal mints{' '}
                <em className={styles.receipts__emphasis}>three receipts.</em>
              </h2>
            </div>
            <p className={styles.receipts__subtitle} data-animate="subtitle">
              Not collectibles. Not art. Permanent, verifiable records of who
              kept their word. Your reputation — portable, unforgeable, yours
              forever.
            </p>
          </div>

          <div className={styles.receipts__grid}>
            {RECEIPTS_CARDS.map((card) => {
              const titleId = `receipt-${card.variant}-title`;
              return (
                <article
                  key={card.variant}
                  className={`${styles.receipts__card} ${VARIANT_CLASS[card.variant]}`}
                  data-animate="card"
                  aria-labelledby={titleId}
                >
                  <header className={styles.receipts__header}>
                    <strong>{card.headerLabel}</strong>
                    <span>{card.headerMeta}</span>
                  </header>
                  <figure className={styles.receipts__visual}>
                    {card.visual}
                    <figcaption className="u-visually-hidden">
                      {card.figCaption}
                    </figcaption>
                  </figure>
                  <footer className={styles.receipts__footer}>
                    <h3 id={titleId} className={styles.receipts__title}>
                      {card.title}
                    </h3>
                    <dl className={styles.receipts__meta}>
                      <dt className="u-visually-hidden">Details</dt>
                      <dd>{card.metaLine}</dd>
                      <dt className="u-visually-hidden">Transaction hash</dt>
                      <dd className={styles.receipts__hash}>{card.hash}</dd>
                    </dl>
                  </footer>
                </article>
              );
            })}
          </div>
        </div>
      </ReceiptsAnimations>
    </section>
  );
}
