import { gsap, ScrollTrigger } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

export interface PinnedSectionOptions {
  /** Element or selector to pin */
  trigger: string | Element;
  /** Scroll distance for the pinned section (default: '+=2000') */
  endOffset?: string;
  /** Scrub smoothing value (default: 1) */
  scrub?: number;
  /** Only pin on desktop and above (default: false) */
  onlyDesktop?: boolean;
}

/**
 * Factory that creates a pinned timeline with scrub.
 * Returns the timeline so callers can chain .to(), .from(), etc.
 *
 * @example
 * const tl = createPinnedTimeline({ trigger: '.my-section' });
 * tl.to('.child-a', { x: 100 })
 *   .to('.child-b', { opacity: 0 });
 */
/**
 * Resolves endOffset strings — converts `vh` units to a functional value
 * because GSAP's `+=` syntax only supports px and %, not CSS viewport units.
 */
function resolveEndOffset(
  endOffset: string,
): string | (() => string) {
  const vhMatch = endOffset.match(/^\+=(\d+(?:\.\d+)?)vh$/);
  if (vhMatch?.[1]) {
    const vhValue = parseFloat(vhMatch[1]);
    return () => `+=${(vhValue / 100) * window.innerHeight}`;
  }
  return endOffset;
}

export function createPinnedTimeline(
  options: PinnedSectionOptions,
): gsap.core.Timeline {
  const {
    trigger,
    endOffset = '+=2000',
    scrub = 1,
    onlyDesktop = false,
  } = options;

  const end = resolveEndOffset(endOffset);
  const tl = gsap.timeline();

  // Visibility lifecycle: hide pinned content when outside its pin zone
  const triggerEl = typeof trigger === 'string'
    ? document.querySelector(trigger)
    : trigger;
  const visibilityCallbacks = {
    onEnter: () => { if (triggerEl instanceof HTMLElement) triggerEl.style.visibility = 'visible'; },
    onLeave: () => { if (triggerEl instanceof HTMLElement) triggerEl.style.visibility = 'hidden'; },
    onEnterBack: () => { if (triggerEl instanceof HTMLElement) triggerEl.style.visibility = 'visible'; },
    onLeaveBack: () => { if (triggerEl instanceof HTMLElement) triggerEl.style.visibility = 'hidden'; },
  };

  if (onlyDesktop) {
    const mm = gsap.matchMedia();

    mm.add(MATCH_MEDIA.desktop, () => {
      ScrollTrigger.create({
        animation: tl,
        trigger,
        start: 'top top',
        end,
        pin: true,
        scrub,
        ...visibilityCallbacks,
      });
    });
  } else {
    ScrollTrigger.create({
      animation: tl,
      trigger,
      start: 'top top',
      end,
      pin: true,
      scrub,
      ...visibilityCallbacks,
    });
  }

  return tl;
}
