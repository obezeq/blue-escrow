'use client';

import { useRef } from 'react';
import { FlowTrail, type FlowTrailHandle } from './FlowTrail';
import { useFlowTimeline } from './useFlowTimeline';
import styles from './TheFlow.module.scss';

export function TheFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<FlowTrailHandle>(null);

  useFlowTimeline(containerRef, trailRef);

  return (
    <section
      className={`o-section o-section--white ${styles.flow}`}
      id="the-flow"
      aria-label="How your money flows"
    >
      <div
        ref={containerRef}
        className={`o-container ${styles.flow__container}`}
      >
        <h2 className={styles.flow__heading} data-animate="heading">
          The flow of your money
        </h2>

        <div className={styles.flow__trail}>
          <FlowTrail ref={trailRef} />
        </div>

        <div className={styles.flow__descriptions} aria-live="polite">
          <p className={styles.flow__step} data-phase="1">
            Funds leave the buyer.
          </p>
          <p className={styles.flow__step} data-phase="2">
            Locked in the smart contract.
          </p>
          <p className={styles.flow__step} data-phase="3">
            Released to the seller.
          </p>
          <p className={styles.flow__step} data-phase="4">
            0.33% fee. That&apos;s it.
          </p>
        </div>
      </div>
    </section>
  );
}
