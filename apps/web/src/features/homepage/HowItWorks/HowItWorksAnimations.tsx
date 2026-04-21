'use client';

import { useRef, type RefObject } from 'react';
import {
  gsap,
  ScrollTrigger,
  ScrollToPlugin,
  useGSAP,
} from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { ACTOR_POSITIONS, CORE_POSITION, HIW_STEPS } from './steps';

interface HowItWorksAnimationsProps {
  children: React.ReactNode;
  stageRef: RefObject<HTMLDivElement | null>;
  onPhaseChange: (phase: 0 | 1 | 2 | 3 | 4) => void;
}

const PHASE_COUNT = HIW_STEPS.length;

type ChildRef = SVGGraphicsElement | null;

function findChild(root: Element | null, tag: string): ChildRef {
  if (!root) return null;
  return root.querySelector<SVGGraphicsElement>(`[data-hiw="${tag}"]`);
}

function setPacketPosition(el: ChildRef, x: number, y: number) {
  if (!el) return;
  el.setAttribute('transform', `translate(${x} ${y})`);
}

/**
 * Head reveals + pinned scrub timeline that drives the v6 HIW diagram.
 *
 * Desktop (>= 900px, no reduced-motion): stage pins for 500vh of scroll.
 * A master GSAP timeline with 5 labels (phase-0..phase-4) fades actors in,
 * lights up the active wire overlay, flies the money packet between actors
 * via transform interpolation, and tweens the ledger amount. Rail button
 * clicks scroll the page to the corresponding phase's pinned offset so
 * everything — timeline + React state + ledger — stays in lockstep.
 *
 * Mobile (< 900px) and reduced-motion: the stage scrolls normally; a cheap
 * ScrollTrigger binned into 5 segments dispatches the phase to React state
 * so narration/rail still update. No pin, no packet flight.
 */
export function HowItWorksAnimations({
  children,
  stageRef,
  onPhaseChange,
}: HowItWorksAnimationsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPhaseRef = useRef<number>(0);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const mm = gsap.matchMedia();

      const eyebrow = container.querySelector('[data-animate="eyebrow"]');
      const heading = container.querySelector('[data-animate="heading"]');
      const subtitle = container.querySelector('[data-animate="subtitle"]');

      // Shared head reveals — live outside matchMedia so reduced-motion also gets
      // them (simple fade-ups, no layout jumps).
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (eyebrow) {
          gsap.from(eyebrow, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: eyebrow, start: 'top 85%', once: true },
          });
        }
        if (heading) {
          gsap.from(heading, {
            y: 30,
            opacity: 0,
            duration: 0.9,
            delay: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: heading, start: 'top 85%', once: true },
          });
        }
        if (subtitle) {
          gsap.from(subtitle, {
            y: 20,
            opacity: 0,
            duration: 0.7,
            delay: 0.2,
            ease: 'power3.out',
            scrollTrigger: { trigger: subtitle, start: 'top 85%', once: true },
          });
        }
      });

      // --- Desktop / tablet (>=900px): pinned master timeline with scrub ---
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        if (!stageRef.current) return;
        const stage = stageRef.current;
        const svgRoot = stage.querySelector('svg');
        const ledgerAmountEl = stage.querySelector<HTMLElement>(
          '[data-hiw-ledger="amount"]',
        );

        if (!svgRoot) return;

        const actors = {
          client: findChild(svgRoot, 'actor-client'),
          mid: findChild(svgRoot, 'actor-mid'),
          seller: findChild(svgRoot, 'actor-seller'),
        };
        const wires = {
          C: findChild(svgRoot, 'wire-active-C'),
          M: findChild(svgRoot, 'wire-active-M'),
          S: findChild(svgRoot, 'wire-active-S'),
        };
        const packet = findChild(svgRoot, 'packet');
        const coreHalo = findChild(svgRoot, 'core-halo');
        const orbits = findChild(svgRoot, 'orbits');

        // Precompute packet coordinates per anchor
        const packetAnchors: Record<'client' | 'core' | 'seller', { x: number; y: number }> = {
          client: ACTOR_POSITIONS.client,
          core: CORE_POSITION,
          seller: ACTOR_POSITIONS.seller,
        };

        // Seed: actors + orbits invisible, packet hidden at client position,
        // wires dark, ledger amount at 0.
        gsap.set(Object.values(actors), { opacity: 0 });
        gsap.set(Object.values(wires), { opacity: 0 });
        gsap.set(coreHalo, { fillOpacity: 0 });
        gsap.set(orbits, { opacity: 0 });
        if (packet) {
          setPacketPosition(packet, packetAnchors.client.x, packetAnchors.client.y);
          gsap.set(packet, { opacity: 0 });
        }

        const masterTl = gsap.timeline({
          scrollTrigger: {
            id: 'hiw-stage',
            trigger: stage,
            start: 'top top',
            end: '+=500%',
            pin: true,
            scrub: 0.5,
            anticipatePin: 1,
            onUpdate(self) {
              const phase = Math.min(
                PHASE_COUNT - 1,
                Math.floor(self.progress * PHASE_COUNT),
              );
              if (phase !== lastPhaseRef.current) {
                lastPhaseRef.current = phase;
                onPhaseChange(phase as 0 | 1 | 2 | 3 | 4);
              }
            },
          },
          defaults: { ease: 'power2.inOut' },
        });

        // --- Phase 0: Meet ---
        masterTl.addLabel('phase-0');
        masterTl.to(Object.values(actors), { opacity: 1, duration: 0.5, stagger: 0.1 }, 'phase-0');
        masterTl.to(orbits, { opacity: 1, duration: 0.5 }, 'phase-0');

        // --- Phase 1: Sign (all 3 wires pulse briefly) ---
        masterTl.addLabel('phase-1', 'phase-0+=0.6');
        masterTl.to(
          [wires.C, wires.M, wires.S],
          { opacity: 0.6, duration: 0.4, stagger: 0.1 },
          'phase-1',
        );
        masterTl.to(
          [wires.C, wires.M, wires.S],
          { opacity: 0, duration: 0.4, stagger: 0.1 },
          'phase-1+=0.5',
        );

        // --- Phase 2: Lock — packet flies client -> core, wire C lights, amount tweens ---
        masterTl.addLabel('phase-2', 'phase-1+=0.8');
        masterTl.to(wires.C, { opacity: 1, duration: 0.4 }, 'phase-2');

        if (packet) {
          const from = packetAnchors.client;
          const to = packetAnchors.core;
          const proxy = { x: from.x, y: from.y };
          masterTl.to(packet, { opacity: 1, duration: 0.2 }, 'phase-2');
          masterTl.to(
            proxy,
            {
              x: to.x,
              y: to.y,
              duration: 0.8,
              onUpdate() {
                setPacketPosition(packet, proxy.x, proxy.y);
              },
            },
            'phase-2+=0.1',
          );
          masterTl.to(
            packet,
            { opacity: 0, duration: 0.2 },
            'phase-2+=0.9',
          );
        }

        masterTl.to(coreHalo, { fillOpacity: 0.25, duration: 0.4 }, 'phase-2+=0.3');

        // Tween ledger amount display 0 -> 2400.
        // v6 timing: 2.0s with `power3.out` for a deliberate, money-flows-in
        // feeling. Phase 4 shipped 0.8s `power2.out` — 2.5x too fast vs design.
        if (ledgerAmountEl) {
          const amountProxy = { value: 0 };
          masterTl.to(
            amountProxy,
            {
              value: 2400,
              duration: 2.0,
              ease: 'power3.out',
              onUpdate() {
                ledgerAmountEl.textContent = Math.round(
                  amountProxy.value,
                ).toLocaleString();
              },
            },
            'phase-2+=0.1',
          );
        }

        // --- Phase 3: Deliver — seller actor highlights, subtle halo hold ---
        masterTl.addLabel('phase-3', 'phase-2+=1.4');
        masterTl.to(
          [actors.client, actors.mid],
          { opacity: 0.45, duration: 0.3 },
          'phase-3',
        );
        masterTl.to(actors.seller, { opacity: 1, duration: 0.3 }, 'phase-3');
        masterTl.to(coreHalo, { fillOpacity: 0.4, duration: 0.4 }, 'phase-3');

        // --- Phase 4: Release — packet flies core -> seller, wire S lights, core releases ---
        masterTl.addLabel('phase-4', 'phase-3+=0.6');
        masterTl.to(wires.C, { opacity: 0, duration: 0.3 }, 'phase-4');
        masterTl.to(wires.S, { opacity: 1, duration: 0.4 }, 'phase-4');

        if (packet) {
          const from = packetAnchors.core;
          const to = packetAnchors.seller;
          const proxy = { x: from.x, y: from.y };
          masterTl.to(packet, { opacity: 1, duration: 0.2 }, 'phase-4');
          masterTl.to(
            proxy,
            {
              x: to.x,
              y: to.y,
              duration: 0.8,
              onUpdate() {
                setPacketPosition(packet, proxy.x, proxy.y);
              },
            },
            'phase-4+=0.1',
          );
          masterTl.to(
            packet,
            { opacity: 0, duration: 0.3 },
            'phase-4+=0.9',
          );
        }

        masterTl.to(coreHalo, { fillOpacity: 0.15, duration: 0.4 }, 'phase-4+=0.4');

        // Trailing buffer so scrub has room to breathe at the bottom
        masterTl.to({}, { duration: 0.6 });

        // Expose seek for rail button click handlers. We scroll the window to
        // the correct pinned offset — that way Lenis + ScrollTrigger + state
        // all stay in sync automatically.
        const stageTrigger = ScrollTrigger.getById('hiw-stage');
        const seekToPhase = (phase: number) => {
          if (!stageTrigger) return;
          const progress = phase / (PHASE_COUNT - 1);
          const target =
            stageTrigger.start + (stageTrigger.end - stageTrigger.start) * progress;
          gsap.to(window, {
            duration: 0.8,
            ease: 'power3.inOut',
            scrollTo: { y: target, autoKill: true },
          });
        };

        const railButtons = container.querySelectorAll<HTMLButtonElement>(
          '[data-hiw-rail]',
        );
        const cleanups: Array<() => void> = [];
        railButtons.forEach((btn) => {
          const handler = () => {
            const phase = Number(btn.dataset.hiwRail);
            if (!Number.isFinite(phase)) return;
            seekToPhase(phase);
          };
          btn.addEventListener('click', handler);
          cleanups.push(() => btn.removeEventListener('click', handler));
        });

        return () => {
          cleanups.forEach((fn) => fn());
        };
      });

      // --- Mobile (<900px) fallback: scroll-binned dispatch, no pin ---
      mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', () => {
        if (!stageRef.current) return;
        const trigger = ScrollTrigger.create({
          trigger: stageRef.current,
          start: 'top 70%',
          end: 'bottom 30%',
          onUpdate(self) {
            const phase = Math.min(
              PHASE_COUNT - 1,
              Math.floor(self.progress * PHASE_COUNT),
            );
            if (phase !== lastPhaseRef.current) {
              lastPhaseRef.current = phase;
              onPhaseChange(phase as 0 | 1 | 2 | 3 | 4);
            }
          },
        });
        return () => trigger.kill();
      });

      // --- Reduced-motion: skip everything, show static final state ---
      mm.add(MATCH_MEDIA.reducedMotion, () => {
        gsap.set(container.querySelectorAll('[data-animate]'), {
          clearProps: 'all',
        });
        // Park on phase 0 so the static content still reads
        onPhaseChange(0);
      });

      // Ensure the plugin is referenced — tree-shaking safety since we only use
      // its side effect through gsap.to(window, { scrollTo }).
      void ScrollToPlugin;
    },
    { scope: containerRef, dependencies: [onPhaseChange, stageRef] },
  );

  return <div ref={containerRef}>{children}</div>;
}
