'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import styles from './CustomCursor.module.scss';

// ---------------------------------------------------------------------------
// CustomCursor — dot + trailing ring that follows a fine-pointer input.
//
// Performance contract:
//   * The cursor is position:fixed at z-index:9999. Any layout-affecting
//     property change (width/height/border/background) on this element
//     would force style/layout/paint of the ENTIRE document on every frame
//     (the element sits above the full page stacking context). Therefore
//     the JS path animates ONLY transform (`scale`) + `opacity` — both are
//     composited on the GPU, never triggering reflow.
//   * Hover-visual differentiation (dot swaps to an outlined ring look on
//     interactive targets) is handled purely by CSS `mix-blend-mode` in the
//     module, guarded by `@supports` so older browsers fall back to a plain
//     color swap with the same scale-only tween (no visual regression).
//
// GSAP lifecycle:
//   * `useGSAP({ scope: dotRef })` — every `gsap.to`/`gsap.quickTo` created
//     inside this callback is auto-reverted when the component unmounts or
//     HMR re-runs the effect. That kills the quickTo leak the raw-useEffect
//     version suffered from.
//   * `hoverIn` / `hoverOut` tweens are pre-created with `paused: true` so
//     pointerover/pointerout do not allocate new tweens per event — they
//     `.restart()` the existing ones.
//   * `useGSAP`'s revert cleans up tweens but NOT DOM listeners, so the
//     `document.addEventListener` calls return an explicit cleanup fn.
//
// data-cursor="text" support:
//   * Targets marked `data-cursor="text"` with a `data-cursor-label` string
//     reveal a pill-shaped text preview below the dot on hover. Content is
//     read from the attribute at pointerover time; the span is animated
//     via autoAlpha + scale (no layout writes).
// ---------------------------------------------------------------------------

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], [data-cursor-hover], [data-cursor]';
const TEXT_CURSOR_ATTR = 'data-cursor';
const TEXT_CURSOR_VALUE = 'text';
const TEXT_CURSOR_LABEL_ATTR = 'data-cursor-label';

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const dot = dotRef.current;
      const circle = circleRef.current;
      const label = labelRef.current;
      if (!dot || !circle || !label) return;

      // Gate: only activate on fine-pointer devices without reduced motion.
      const finePointer = window.matchMedia('(pointer: fine)');
      const reducedMotion = window.matchMedia(MATCH_MEDIA.reducedMotion);
      if (!finePointer.matches || reducedMotion.matches) return;

      let confirmed = false;

      // Position quickTos — transform-only. gsap.quickTo batches writes to the
      // ticker so rapid pointermove events don't flood the style queue.
      const dotX = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3.out' });
      const dotY = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3.out' });
      const circleX = gsap.quickTo(circle, 'x', { duration: 0.3, ease: 'power3.out' });
      const circleY = gsap.quickTo(circle, 'y', { duration: 0.3, ease: 'power3.out' });

      // Pre-created hover tweens. `paused: true` means they don't run until
      // `.restart()` is called in a handler. Animating `scale` on the dot
      // keeps the box unchanged; the CSS `mix-blend-mode: difference`
      // handles the color/inversion look on top of arbitrary backdrops.
      const hoverIn = gsap.to(dot, {
        scale: 6,
        duration: 0.25,
        ease: 'power3.out',
        paused: true,
      });
      const hoverOut = gsap.to(dot, {
        scale: 1,
        duration: 0.25,
        ease: 'power3.out',
        paused: true,
      });
      const circleFade = gsap.to(circle, {
        opacity: 0,
        duration: 0.15,
        paused: true,
      });
      const circleRestore = gsap.to(circle, {
        opacity: 1,
        duration: 0.15,
        paused: true,
      });

      // Text-preview tweens for elements with `data-cursor="text"`.
      // autoAlpha + scale only — no width/height writes.
      const labelIn = gsap.to(label, {
        autoAlpha: 1,
        scale: 1,
        duration: 0.2,
        ease: 'power3.out',
        paused: true,
      });
      const labelOut = gsap.to(label, {
        autoAlpha: 0,
        scale: 0.8,
        duration: 0.2,
        ease: 'power3.out',
        paused: true,
      });

      const activate = () => {
        document.documentElement.style.cursor = 'none';
        gsap.set([dot, circle], { opacity: 1 });
      };

      const handlePointerMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        if (!confirmed) {
          confirmed = true;
          activate();
        }
        dotX(e.clientX);
        dotY(e.clientY);
        circleX(e.clientX);
        circleY(e.clientY);
      };

      const handlePointerOver = (e: PointerEvent) => {
        if (!confirmed) return;
        const rawTarget = e.target as HTMLElement | null;
        const target = rawTarget?.closest?.(INTERACTIVE_SELECTOR) as
          | HTMLElement
          | null;
        if (!target) return;

        hoverOut.pause();
        hoverIn.restart();
        circleRestore.pause();
        circleFade.restart();

        // data-cursor="text" → show label preview centered under the dot.
        if (target.getAttribute(TEXT_CURSOR_ATTR) === TEXT_CURSOR_VALUE) {
          const text = target.getAttribute(TEXT_CURSOR_LABEL_ATTR) ?? '';
          label.textContent = text;
          labelOut.pause();
          labelIn.restart();
        }
      };

      const handlePointerOut = (e: PointerEvent) => {
        if (!confirmed) return;
        const rawTarget = e.target as HTMLElement | null;
        const target = rawTarget?.closest?.(INTERACTIVE_SELECTOR) as
          | HTMLElement
          | null;
        if (!target) return;

        hoverIn.pause();
        hoverOut.restart();
        circleFade.pause();
        circleRestore.restart();

        if (target.getAttribute(TEXT_CURSOR_ATTR) === TEXT_CURSOR_VALUE) {
          labelIn.pause();
          labelOut.restart();
        }
      };

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerover', handlePointerOver);
      document.addEventListener('pointerout', handlePointerOut);

      // NB: `useGSAP` reverts registered tweens on unmount but does NOT
      // remove DOM listeners — return them ourselves.
      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerover', handlePointerOver);
        document.removeEventListener('pointerout', handlePointerOut);
        document.documentElement.style.cursor = '';
      };
    },
    { scope: dotRef },
  );

  return (
    <div className={styles.cursor} aria-hidden="true">
      <div ref={dotRef} className={styles.cursor__dot}>
        <span ref={labelRef} className={styles.cursor__label} />
      </div>
      <div ref={circleRef} className={styles.cursor__circle} />
    </div>
  );
}
