'use client';

import styles from './GrainOverlay.module.scss';

/**
 * Fixed full-viewport SVG-noise film grain. Sits above content but
 * below modals, ignores pointer events, and reads opacity / blend-mode
 * from CSS keyed on :root[data-theme]. Reduced-motion users get a
 * further opacity drop.
 */
export function GrainOverlay() {
  return <div className={styles.grain} aria-hidden="true" />;
}
