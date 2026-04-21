'use client';

import { useCallback, useId, useState } from 'react';
import { FaqAnimations } from './FaqAnimations';
import { FAQ_ITEMS } from './questions';
import styles from './Faq.module.scss';

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  const toggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <section className={`o-section ${styles.faq}`} id="faq" aria-label="Frequently asked questions">
      <FaqAnimations>
        <div className={styles.faq__wrap}>
          <div className={styles.faq__head}>
            <div>
              <div className={styles.faq__eyebrow} data-animate="eyebrow">
                Questions
              </div>
              <h2 className={styles.faq__heading} data-animate="heading">
                Answers, <em className={styles.faq__emphasis}>plainly said.</em>
              </h2>
            </div>
            <p className={styles.faq__subtitle} data-animate="subtitle">
              No jargon, no hand-waving. If you&apos;ve never touched a wallet, start here.
            </p>
          </div>

          <div className={styles.faq__list} role="list">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index;
              const panelId = `${baseId}-faq-${index}-panel`;
              const buttonId = `${baseId}-faq-${index}-button`;
              return (
                <div
                  key={item.count}
                  className={`${styles.faq__item} ${isOpen ? styles['faq__item--open'] : ''}`}
                  data-animate="item"
                  role="listitem"
                >
                  <button
                    id={buttonId}
                    type="button"
                    className={styles.faq__question}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(index)}
                  >
                    <span className={styles.faq__count}>{item.count}</span>
                    <span className={styles.faq__label}>{item.question}</span>
                    <svg
                      className={styles.faq__icon}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <div
                    id={panelId}
                    className={styles.faq__answer}
                    role="region"
                    aria-labelledby={buttonId}
                    aria-hidden={!isOpen}
                  >
                    <div className={styles.faq__answerInner}>{item.answer}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </FaqAnimations>
    </section>
  );
}
