'use client';

import { type RefObject } from 'react';
import { gsap, useGSAP } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { createPinnedTimeline } from '@/animations/scrollTrigger/pinnedSection';
import { FLOW_COLORS, type FlowTrailHandle } from './FlowTrail';

// Timeline budget (normalized durations, sum = 1.0)
const B = {
  phase1: 0.30, // Buyer → Contract trail draw
  phase2: 0.30, // Contract glow
  phase3: 0.25, // Contract → Seller trail + checkmark
  phase4: 0.15, // Full trail illuminates + fee
};

/**
 * Pinned scrub timeline that animates the FlowTrail SVG.
 * Desktop: 3x viewport, Mobile: 2x viewport.
 * Reduced motion: static completed trail.
 */
export function useFlowTimeline(
  containerRef: RefObject<HTMLDivElement | null>,
  trailRef: RefObject<FlowTrailHandle | null>,
) {
  useGSAP(
    () => {
      if (!containerRef.current || !trailRef.current) return;
      const container = containerRef.current;
      const trail = trailRef.current;
      const mm = gsap.matchMedia();

      // Desktop + tablet: full pinned timeline
      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          buildDesktopTimeline(container, trail, '+=300vh');
        },
      );

      // Mobile: shorter pin
      mm.add(
        '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        () => {
          buildDesktopTimeline(container, trail, '+=200vh');
        },
      );

      // Reduced motion: show completed state
      mm.add(MATCH_MEDIA.reducedMotion, () => {
        showCompletedState(container, trail);
      });
    },
    { scope: containerRef },
  );
}

// ---------------------------------------------------------------------------
// Pinned scrub timeline (shared between desktop and mobile, different pin length)
// ---------------------------------------------------------------------------

function buildDesktopTimeline(
  container: HTMLElement,
  trail: FlowTrailHandle,
  endOffset: string,
) {
  const section = container.closest('section');
  if (!section) return;

  const { trailPath, particle, contractGlow, checkmark, feeLabel } = trail;
  if (!trailPath || !particle) return;

  const pathLength = trailPath.getTotalLength();
  const [phase1, phase2, phase3, phase4] = Array.from(
    container.querySelectorAll('[data-phase]'),
  );

  if (!phase1 || !phase2 || !phase3 || !phase4) return;

  // Initial state: trail hidden, descriptions hidden
  gsap.set(trailPath, {
    attr: {
      'stroke-dasharray': pathLength,
      'stroke-dashoffset': pathLength,
    },
  });
  gsap.set([phase1, phase2, phase3, phase4], { opacity: 0 });

  const tl = createPinnedTimeline({
    trigger: section,
    endOffset,
    scrub: 1,
  });

  // --- Phase 1 (0-30%): Buyer → Contract ---
  const p1Proxy = { progress: 0 };
  tl.to(phase1, { opacity: 1, duration: 0.02 });
  tl.to(
    p1Proxy,
    {
      progress: 0.5,
      duration: B.phase1,
      ease: 'power2.inOut',
      onUpdate() {
        // Draw trail left → center
        gsap.set(trailPath, {
          attr: { 'stroke-dashoffset': pathLength * (1 - p1Proxy.progress) },
        });
        // Move particle along path
        const pt = trailPath.getPointAtLength(p1Proxy.progress * pathLength);
        gsap.set(particle, { attr: { cx: pt.x, cy: pt.y } });
      },
    },
    '<',
  );

  // --- Phase 2 (30-60%): Contract glow ---
  // Cross-fade descriptions
  tl.to(phase1, { opacity: 0, duration: 0.03 });
  tl.to(phase2, { opacity: 1, duration: 0.03 }, '<');

  if (contractGlow) {
    tl.to(
      contractGlow,
      {
        attr: { fill: FLOW_COLORS.contractGlow },
        duration: B.phase2 * 0.4,
        ease: 'power2.inOut',
      },
      '<',
    );
    tl.to(contractGlow, {
      attr: { stroke: FLOW_COLORS.bluePrimary },
      duration: B.phase2 * 0.3,
      ease: 'power2.out',
    });
  }
  tl.to({}, { duration: B.phase2 * 0.3 });

  // --- Phase 3 (60-85%): Contract → Seller + checkmark ---
  tl.to(phase2, { opacity: 0, duration: 0.03 });
  tl.to(phase3, { opacity: 1, duration: 0.03 }, '<');

  const p3Proxy = { progress: 0.5 };
  tl.to(
    p3Proxy,
    {
      progress: 1,
      duration: B.phase3,
      ease: 'power2.inOut',
      onUpdate() {
        gsap.set(trailPath, {
          attr: { 'stroke-dashoffset': pathLength * (1 - p3Proxy.progress) },
        });
        const pt = trailPath.getPointAtLength(p3Proxy.progress * pathLength);
        gsap.set(particle, { attr: { cx: pt.x, cy: pt.y } });
      },
    },
    '<+=0.03',
  );

  // Checkmark reveal at end of phase 3
  if (checkmark) {
    tl.to(
      checkmark,
      {
        opacity: 1,
        duration: 0.04,
        ease: 'power3.out',
      },
      '>-0.06',
    );
  }

  // --- Phase 4 (85-100%): Full trail + fee ---
  tl.to(phase3, { opacity: 0, duration: 0.03 });
  tl.to(phase4, { opacity: 1, duration: 0.03 }, '<');

  // Trail brightness pulse
  tl.to(trailPath, {
    attr: { 'stroke-width': 5 },
    duration: B.phase4 * 0.3,
    ease: 'power2.inOut',
  });
  tl.to(trailPath, {
    attr: { 'stroke-width': 3 },
    duration: B.phase4 * 0.3,
    ease: 'power2.out',
  });

  // Fee label
  if (feeLabel) {
    tl.to(
      feeLabel,
      { opacity: 1, duration: 0.04, ease: 'power3.out' },
      '<-0.04',
    );
  }

  tl.to({}, { duration: B.phase4 * 0.4 });
}

// ---------------------------------------------------------------------------
// Reduced motion: static completed trail
// ---------------------------------------------------------------------------

function showCompletedState(
  container: HTMLElement,
  trail: FlowTrailHandle,
) {
  const { trailPath, particle, contractGlow, checkmark, feeLabel } = trail;

  // Trail fully drawn
  if (trailPath) {
    gsap.set(trailPath, { attr: { 'stroke-dashoffset': 0 } });
  }

  // Particle at seller
  if (particle) {
    gsap.set(particle, { attr: { cx: 900, cy: 350 } });
  }

  // Contract glow
  if (contractGlow) {
    gsap.set(contractGlow, {
      attr: { fill: FLOW_COLORS.contractGlow, stroke: FLOW_COLORS.bluePrimary },
    });
  }

  // Checkmark visible
  if (checkmark) {
    gsap.set(checkmark, { opacity: 1 });
  }

  // Fee visible
  if (feeLabel) {
    gsap.set(feeLabel, { opacity: 1 });
  }

  // All descriptions visible
  gsap.set(container.querySelectorAll('[data-phase]'), {
    clearProps: 'all',
  });
}
