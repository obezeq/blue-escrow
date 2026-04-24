'use client';

// ---------------------------------------------------------------------------
// HowItWorksAnimations (v7 — Wave 1 Agent A)
// ---------------------------------------------------------------------------
//
// Master pinned timeline + Lenis-native rail seek + SplitText narration
// reveals + stroke-dashoffset wire flow + MotionPath packet flights +
// --hiw-heat CSS custom property for single-breath halo/background.
//
// COORDINATION CONTRACT (PRD §6):
//   - Props: { children, stageRef, onPhaseChange } — do NOT change.
//   - onPhaseChange captured via ref (NOT in useGSAP deps) — avoids
//     re-runs on every parent render.
//   - Reads PHASE_COUNT from steps.tsx (falls back to HIW_STEPS.length).
//   - Dispatches React state by NEAREST LABEL, not integer bins.
//   - Exposes dev-only window.__hiwStageTrigger for e2e harness.
//   - Writes --hiw-heat (0..1) on the pinned stage via gsap.quickSetter.
//   - Registered custom eases: hiw-enter, hiw-exit, hiw-snap, hiw-money,
//     hiw-packet, hiw-halo (see hiw-eases.ts).
//
// TODO(Agent D):
//   The narration title must carry `data-animate="narr-title"` and the
//   narration body `data-animate="narr-body"` so the SplitText chars-reveal
//   can target them. HowItWorks.tsx currently renders the narration <h3>
//   without a data-attribute — please add those. The narration must also
//   be keyed by React `key={active}` so each phase change remounts it and
//   SplitText re-runs cleanly.
//
// TODO(Agent C):
//   The packet <g> in HiwDiagram.tsx has `transform="translate(180 420)"`
//   baked into JSX. We seed the initial position via gsap.set on mount
//   (so it still works), but please remove the attribute so GSAP is the
//   single source of truth for the packet's transform.
//
// TODO(Agent D / C):
//   Mobile deck phase cards are expected to render with attribute
//   `data-hiw-phase-card={n}` (0..4) and inner animatable elements with
//   `[data-animate]`. If those markers aren't present, the mobile branch
//   becomes a no-op (safe — phase state is driven by IntersectionObserver
//   in the shell instead).

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import {
  gsap,
  ScrollTrigger,
  SplitText,
  MotionPathPlugin,
  useGSAP,
} from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';
import { SCRUB_DEFAULTS_SAFE, scheduleRefresh } from '@/animations/config/motion-system';
import { useLenisInstance } from '@/providers/LenisProvider';
import {
  ACTOR_POSITIONS,
  CORE_POSITION,
  HIW_STEPS,
  type HiwStep,
} from './data';
import { HIW_EASE_NAMES, registerHiwEases } from './hiw-eases';

// Ensure the eases are registered at module load time (once per JS bundle).
// Guarded inside the helper against HMR double-registration.
registerHiwEases();

// Reference the MotionPath plugin so bundlers don't tree-shake the side-effect
// import that registered it in gsap-register.ts.
void MotionPathPlugin;

// ---------------------------------------------------------------------------
// Contract constants (match across all agents)
// ---------------------------------------------------------------------------

const PHASE_COUNT = HIW_STEPS.length;
const PHASE_LABELS = Array.from(
  { length: PHASE_COUNT },
  (_, i) => `phase-${i}`,
) as readonly string[];

type PhaseIndex = 0 | 1 | 2 | 3 | 4;

interface HowItWorksAnimationsProps {
  children: React.ReactNode;
  pinHostRef: RefObject<HTMLDivElement | null>;
  onPhaseChange: (phase: PhaseIndex) => void;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

type ChildRef = SVGGraphicsElement | null;

function findChild(root: Element | null, tag: string): ChildRef {
  if (!root) return null;
  return root.querySelector<SVGGraphicsElement>(`[data-hiw="${tag}"]`);
}

/**
 * Find the label with the smallest |progress - p| for a given normalized
 * progress value p. Returns the index (0..PHASE_COUNT-1). Ensures the React
 * narration lines up with the snap target, not an integer bin.
 */
function nearestLabelIndex(
  progress: number,
  labelProgresses: readonly number[],
): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < labelProgresses.length; i++) {
    const p = labelProgresses[i];
    if (p === undefined) continue;
    const d = Math.abs(progress - p);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HowItWorksAnimations({
  children,
  pinHostRef,
  onPhaseChange,
}: HowItWorksAnimationsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPhaseRef = useRef<number>(0);

  // Capture the callback + pinHostRef in refs so they never trigger useGSAP
  // dependency churn. The onPhaseChange prop from HowItWorks is a setState
  // function so it's stable across renders in practice, but relying on that
  // is brittle — this pattern is safer and documented in gsap-react.
  const onPhaseChangeRef = useRef(onPhaseChange);
  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
  }, [onPhaseChange]);

  const pinHostRefRef = useRef(pinHostRef);
  useEffect(() => {
    pinHostRefRef.current = pinHostRef;
  }, [pinHostRef]);

  // Lenis instance for rail scroll-to. Reading at top level is the only
  // supported pattern — useLenis must live inside a LenisProvider.
  const lenis = useLenisInstance();
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  // Stable dispatcher — reads latest callback via ref.
  const dispatchPhase = useCallback((phase: number) => {
    if (phase === lastPhaseRef.current) return;
    lastPhaseRef.current = phase;
    onPhaseChangeRef.current(phase as PhaseIndex);
  }, []);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const mm = gsap.matchMedia();

      // Settle font-swap layout jumps. Optional chaining for Safari < 16
      // where document.fonts may be undefined.
      document.fonts?.ready
        .then(() => ScrollTrigger.refresh())
        .catch(() => {});

      // Force ScrollTrigger to recompute start/end after the page's layout
      // has fully settled. Without this, the pin_start gets cached at
      // create-time when dev-mode UI (Next.js/Turbopack overlay, error
      // banners) or lazy-loaded assets above the #hiw section are still
      // affecting the flow. Users reported the pin engaging ~200px LATER
      // than the pinHost's actual final position because the section was
      // measured while something above was still tall.
      //
      // These extra refreshes are cheap (ScrollTrigger internally dedupes
      // redundant refreshes) and guarantee start/end match the
      // user-visible layout by the time they scroll into view.
      // The setTimeouts' return IDs aren't tracked — the refresh callbacks
      // themselves are safe to fire after component unmount (ScrollTrigger
      // dedupes / safely no-ops on killed triggers).
      for (const ms of [0, 500, 1500, 3000, 5000]) {
        window.setTimeout(() => ScrollTrigger.refresh(), ms);
      }
      if (document.readyState !== 'complete') {
        window.addEventListener('load', () => ScrollTrigger.refresh(), {
          once: true,
        });
      }

      // ---- Layer A · ResizeObserver on <html>
      // Catches every layout shift above #hiw — Preloader unmount (~4020ms
      // after mount), font-swap reflow (Geist display:swap), lazy-loaded
      // images in Hero/TheProblem, etc. — and fires ScrollTrigger.refresh()
      // AFTER the browser has recomputed layout, so trigger.top is accurate.
      // Debounced via requestAnimationFrame so multiple back-to-back resize
      // events within a single frame coalesce into one refresh.
      let resizeRafId = 0;
      const resizeObserver = new ResizeObserver(() => {
        if (resizeRafId) cancelAnimationFrame(resizeRafId);
        resizeRafId = requestAnimationFrame(() => ScrollTrigger.refresh());
      });
      resizeObserver.observe(document.documentElement);

      // NOTE: ScrollTrigger.normalizeScroll(true) would be the obvious
      // complement to the ResizeObserver above, but Lenis already owns
      // wheel-event normalization (LenisProvider.tsx:54 wires
      // `lenis.on('scroll', ScrollTrigger.update)` plus the gsap.ticker
      // ↔ lenis.raf bridge). Enabling normalizeScroll on top of that
      // double-binds wheel handling and breaks smooth scroll feel.
      // ResizeObserver alone captures the preloader-unmount root cause,
      // which is the one drift source not already caught by the existing
      // document.fonts.ready + window.load + setTimeout refresh layers.

      const eyebrow = container.querySelector<HTMLElement>(
        '[data-animate="eyebrow"]',
      );
      const heading = container.querySelector<HTMLElement>(
        '[data-animate="heading"]',
      );
      const subtitle = container.querySelector<HTMLElement>(
        '[data-animate="subtitle"]',
      );

      // Head reveals — kept in no-preference branch (reduced-motion branch
      // handles visibility fallback separately).
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

      // ----------------------------------------------------------------
      // Desktop / tablet (>= 900px wide, no reduced-motion): pinned master timeline
      // ----------------------------------------------------------------
      // Width-only gate to match the pinHost CSS switch. The old
      // `(min-height: 700px)` requirement excluded desktop users with
      // DevTools docked at the bottom (height collapses below 700), who
      // then fell into the mobile branch and silently lost the pin.
      // `min-block-size` on the pinHost covers the short-viewport case.
      mm.add(
        '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
        () => {
          const pinHost = pinHostRefRef.current.current;
          if (!pinHost) return;

          // The pinHost contains .hiw__intro + .hiw__stage. The SVG and
          // ledger-amount live inside .hiw__stage → .hiw__scene; descendant
          // queries from pinHost still resolve them unambiguously.
          const svgRoot = pinHost.querySelector('svg');
          const ledgerAmountEl = pinHost.querySelector<HTMLElement>(
            '[data-hiw-ledger="amount"]',
          );
          if (!svgRoot) return;
          // `stage` used downstream for --hiw-heat / --hiw-rail-progress
          // quickSetters and rail hitboxes stays the SAME DOM node; alias
          // it so the rest of the closure reads unchanged.
          const stage = pinHost;

          // Read --header-height once so the pin start can offset by the
          // fixed nav's height. Without this, `start: 'top top'` anchors the
          // stage flush with the viewport top and the 73px (4.5rem) header
          // overlaps the top of the diagram the whole time the pin is held.
          const headerRem = parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              '--header-height',
            ),
          ) || 4.5;
          const rem =
            parseFloat(getComputedStyle(document.documentElement).fontSize) ||
            16;
          const headerPx = headerRem * rem;

          const actors = {
            client: findChild(svgRoot, 'actor-client'),
            mid: findChild(svgRoot, 'actor-mid'),
            seller: findChild(svgRoot, 'actor-seller'),
          };
          const actorList = [actors.client, actors.mid, actors.seller].filter(
            (n): n is SVGGraphicsElement => n !== null,
          );
          const wires = {
            C: findChild(svgRoot, 'wire-active-C'),
            M: findChild(svgRoot, 'wire-active-M'),
            S: findChild(svgRoot, 'wire-active-S'),
          };
          const wireBases = {
            C: findChild(svgRoot, 'wire-base-C'),
            S: findChild(svgRoot, 'wire-base-S'),
          };
          const packet = findChild(svgRoot, 'packet');
          const coreHalo = findChild(svgRoot, 'core-halo');
          const orbits = findChild(svgRoot, 'orbits');

          // --- Seed state ------------------------------------------------
          // Actors are visible from the moment the pin engages. Phase 0 "Meet"
          // no longer fades them in (scrub timelines show the seed state at
          // progress 0, so opacity:0 left the pucks invisible for the first
          // quarter of the pin). The Meet emphasis comes from the stagger +
          // micro-scale pulse in phase 0.
          //
          // Orbits hidden; wires dark; halo off; packet at client position but
          // invisible. If packet <g> still carries transform="translate(...)"
          // from JSX, our gsap.set here overrides it cleanly because we use
          // x/y (GSAP transform aliases).
          gsap.set(actorList, {
            opacity: 1,
            scale: 1,
            transformOrigin: '50% 50%',
          });
          gsap.set(Object.values(wires), { opacity: 0 });
          gsap.set(coreHalo, { fillOpacity: 0 });
          gsap.set(orbits, { opacity: 0 });
          if (packet) {
            gsap.set(packet, {
              opacity: 0,
              x: ACTOR_POSITIONS.client.x,
              y: ACTOR_POSITIONS.client.y,
            });
          }

          // --- Stroke-dashoffset wire flow (light flowing through wires) -
          // Run an infinite ease:'none' loop on each active wire path; the
          // timeline fades the wire's opacity in/out but the flow is always
          // ticking underneath, so lit wires always feel alive.
          const wireFlows: gsap.core.Tween[] = [];
          for (const wire of [wires.C, wires.M, wires.S]) {
            if (!wire) continue;
            const path = wire as unknown as SVGPathElement;
            const L = path.getTotalLength?.() ?? 0;
            if (!L) continue;
            gsap.set(wire, {
              strokeDasharray: `${L * 0.22} ${L}`,
              strokeDashoffset: L,
            });
            wireFlows.push(
              gsap.to(wire, {
                strokeDashoffset: -L,
                duration: 1.1,
                ease: 'none',
                repeat: -1,
              }),
            );
          }

          // --- quickSetter for --hiw-heat (0..1) on the pinned stage -----
          const heatSetter = gsap.quickSetter(stage, '--hiw-heat');

          // --- Master timeline ------------------------------------------
          // We intentionally create this WITHOUT the ScrollTrigger first so
          // we can compute labelProgresses AFTER it's fully authored, then
          // attach the ScrollTrigger with the correct snap config.
          const masterTl = gsap.timeline({
            paused: true,
            defaults: { ease: 'power2.inOut' },
          });

          // phase-0: Meet
          masterTl.addLabel(PHASE_LABELS[0]!);
          if (actorList.length) {
            // Subtle scale pulse at phase 0 "Meet" — actors are already at
            // opacity:1 from the seed (see note above) so this is purely a
            // micro-bounce on entry. `gsap.from` animates FROM the stated
            // values TO the current (seed) state, so the pucks pulse from
            // scale:0.96 back to scale:1.
            masterTl.from(
              actorList,
              {
                scale: 0.96,
                duration: 0.6,
                stagger: 0.12,
                ease: HIW_EASE_NAMES.enter,
              },
              PHASE_LABELS[0]!,
            );
          }
          if (orbits) {
            masterTl.to(
              orbits,
              { opacity: 1, duration: 0.5 },
              PHASE_LABELS[0]!,
            );
          }

          // phase-1: Sign — three wires pulse
          masterTl.addLabel(PHASE_LABELS[1]!, `${PHASE_LABELS[0]!}+=0.7`);
          const wireList = [wires.C, wires.M, wires.S].filter(
            (w): w is SVGGraphicsElement => w !== null,
          );
          if (wireList.length) {
            masterTl.to(
              wireList,
              { opacity: 0.6, duration: 0.4, stagger: 0.1 },
              PHASE_LABELS[1]!,
            );
            masterTl.to(
              wireList,
              { opacity: 0, duration: 0.4, stagger: 0.1 },
              `${PHASE_LABELS[1]!}+=0.5`,
            );
          }

          // phase-2: Lock — packet flies client -> core along wire-base-C
          masterTl.addLabel(PHASE_LABELS[2]!, `${PHASE_LABELS[1]!}+=0.7`);
          if (wires.C) {
            masterTl.to(
              wires.C,
              { opacity: 1, duration: 0.4 },
              PHASE_LABELS[2]!,
            );
          }
          if (packet && wireBases.C) {
            masterTl.to(
              packet,
              { opacity: 1, duration: 0.2 },
              PHASE_LABELS[2]!,
            );
            masterTl.to(
              packet,
              {
                duration: 0.8,
                ease: HIW_EASE_NAMES.packet,
                motionPath: {
                  path: wireBases.C as unknown as SVGPathElement,
                  align: wireBases.C as unknown as SVGPathElement,
                  alignOrigin: [0.5, 0.5],
                  autoRotate: false,
                },
              },
              `${PHASE_LABELS[2]!}+=0.1`,
            );
            masterTl.to(
              packet,
              { opacity: 0, duration: 0.2 },
              `${PHASE_LABELS[2]!}+=0.9`,
            );
          }
          if (coreHalo) {
            masterTl.to(
              coreHalo,
              {
                fillOpacity: 0.38,
                duration: 0.45,
                ease: HIW_EASE_NAMES.halo,
              },
              `${PHASE_LABELS[2]!}+=0.3`,
            );
          }
          // Ledger amount proxy tween — 0 -> 2400 with deliberate ease.
          if (ledgerAmountEl) {
            const amountProxy = { value: 0 };
            masterTl.to(
              amountProxy,
              {
                value: 2400,
                duration: 1.2,
                ease: HIW_EASE_NAMES.money,
                onUpdate() {
                  ledgerAmountEl.textContent = Math.round(
                    amountProxy.value,
                  ).toLocaleString();
                },
              },
              `${PHASE_LABELS[2]!}+=0.1`,
            );
          }

          // phase-3: Deliver — seller highlights, client+mid dim, halo holds
          masterTl.addLabel(PHASE_LABELS[3]!, `${PHASE_LABELS[2]!}+=1.1`);
          const dimActors = [actors.client, actors.mid].filter(
            (a): a is SVGGraphicsElement => a !== null,
          );
          if (dimActors.length) {
            masterTl.to(
              dimActors,
              { opacity: 0.45, duration: 0.3 },
              PHASE_LABELS[3]!,
            );
          }
          if (actors.seller) {
            masterTl.to(
              actors.seller,
              { opacity: 1, duration: 0.3 },
              PHASE_LABELS[3]!,
            );
          }
          if (coreHalo) {
            masterTl.to(
              coreHalo,
              {
                fillOpacity: 0.32,
                duration: 0.45,
                ease: HIW_EASE_NAMES.halo,
              },
              PHASE_LABELS[3]!,
            );
          }

          // phase-4: Release — packet flies core -> seller, wire S lights,
          // halo spikes then decays so section ends on release, not bright.
          masterTl.addLabel(PHASE_LABELS[4]!, `${PHASE_LABELS[3]!}+=0.8`);
          if (wires.C) {
            masterTl.to(
              wires.C,
              { opacity: 0, duration: 0.3 },
              PHASE_LABELS[4]!,
            );
          }
          if (wires.S) {
            masterTl.to(
              wires.S,
              { opacity: 1, duration: 0.4 },
              PHASE_LABELS[4]!,
            );
          }
          // Restore the dimmed actors (client + middleman) back to full
          // opacity on Release. Phase-3 (Deliver) dropped them to 0.45 to
          // highlight the seller; by the time the contract PAYS OUT, all
          // three parties are settled and should be visible at full weight.
          // Without this restore, the user perceives the stage as "shrinking"
          // into just the seller area by the end.
          const restoreActors = [actors.client, actors.mid].filter(
            (a): a is SVGGraphicsElement => a !== null,
          );
          if (restoreActors.length) {
            masterTl.to(
              restoreActors,
              { opacity: 1, duration: 0.4 },
              PHASE_LABELS[4]!,
            );
          }
          if (packet && wireBases.S) {
            // Reposition to core before the flight, then fly along wire-base-S.
            masterTl.set(
              packet,
              { x: CORE_POSITION.x, y: CORE_POSITION.y },
              PHASE_LABELS[4]!,
            );
            masterTl.to(
              packet,
              { opacity: 1, duration: 0.2 },
              PHASE_LABELS[4]!,
            );
            masterTl.to(
              packet,
              {
                duration: 0.8,
                ease: HIW_EASE_NAMES.packet,
                motionPath: {
                  path: wireBases.S as unknown as SVGPathElement,
                  align: wireBases.S as unknown as SVGPathElement,
                  alignOrigin: [0.5, 0.5],
                  autoRotate: false,
                  // wire-base-S is authored seller->core (940->660) but the
                  // narrative demands core->seller on Release (contract pays
                  // out to the seller). Reverse playback along the path via
                  // start:1, end:0 so the packet flies from (660,400) — just
                  // outside the core — to (940,420) at the seller's position.
                  start: 1,
                  end: 0,
                },
              },
              `${PHASE_LABELS[4]!}+=0.1`,
            );
            masterTl.to(
              packet,
              { opacity: 0, duration: 0.3 },
              `${PHASE_LABELS[4]!}+=0.9`,
            );
          }
          if (coreHalo) {
            // Spike, then decay.
            masterTl.to(
              coreHalo,
              {
                fillOpacity: 0.55,
                duration: 0.3,
                ease: HIW_EASE_NAMES.halo,
              },
              `${PHASE_LABELS[4]!}+=0.2`,
            );
            masterTl.to(
              coreHalo,
              {
                fillOpacity: 0.12,
                duration: 1.0,
                ease: 'power2.out',
              },
              `${PHASE_LABELS[4]!}+=0.6`,
            );
          }

          // Tail so the last label has a stable progress < 1.0 and snap
          // can settle on it without overshoot at the bottom of the range.
          masterTl.to({}, { duration: 0.3 });

          // --- Compute labelProgresses (AFTER authoring) -----------------
          let labelProgresses: number[] = PHASE_LABELS.map((name) => {
            const t = masterTl.labels[name];
            const dur = masterTl.duration();
            return dur > 0 && typeof t === 'number' ? t / dur : 0;
          });

          // --- Attach ScrollTrigger with snap to labelProgresses ---------
          // `scrub: 0.25` — lower than the old 0.6 — because the five-phase
          // master timeline is short and a long scrub lag made "Lock" and
          // "Release" feel mushy (animation trailing the scroll by a
          // noticeable beat). 0.25 keeps the smoothing that hides Lenis
          // inertia but lets the packet flight & halo spike land on-beat
          // with the wheel/trackpad.
          //
          // `SCRUB_DEFAULTS_SAFE` now bundles `invalidateOnRefresh` +
          // `fastScrollEnd` + `anticipatePin`; keeping the explicit
          // `pin: true` + `pinType: 'transform'` + `pinSpacing: true`
          // above since those aren't part of the scrub safety policy.
          const st = ScrollTrigger.create({
            id: 'hiw-stage',
            trigger: stage,
            start: () => `top ${headerPx}px`,
            end: () =>
              // Pin distance: 4 transitions × 0.25vh = 1.0vh total. User
              // feedback on the 2.0vh (0.5 multiplier) attempt was still
              // "releases too far down" — the stage effectively stayed
              // pinned for ~2 viewport heights of scroll, which at typical
              // wheel speeds feels like 5-10 seconds frozen at the rail.
              // At 1.0vh the rail appears, the timeline scrubs through in
              // ~2-3 seconds of scroll, and the pin releases right where
              // the rail was visible — Safeguards panel comes in cleanly.
              // Snap ratios inside the timeline are unchanged (they're
              // proportional to timeline.duration, not scroll distance),
              // so the 5 phase targets still compress cleanly.
              '+=' +
              Math.round(window.innerHeight * (PHASE_COUNT - 1) * 0.25),
            pin: true,
            pinType: 'transform',
            pinSpacing: true,
            scrub: 0.25,
            ...SCRUB_DEFAULTS_SAFE,
            animation: masterTl,
            snap: {
              snapTo: labelProgresses,
              duration: { min: 0.2, max: 0.6 },
              delay: 0.05,
              ease: HIW_EASE_NAMES.snap,
              directional: false,
            },
            onUpdate(self) {
              // Nearest-label dispatch
              const idx = nearestLabelIndex(self.progress, labelProgresses);
              if (idx !== lastPhaseRef.current) {
                dispatchPhase(idx);
              }
              // Write --hiw-heat from master timeline's own progress so the
              // CSS custom property matches the tween scrub, not the raw
              // ScrollTrigger progress (these only diverge during snap).
              heatSetter(masterTl.progress());
            },
            onRefresh() {
              // Duration can change if the timeline gets re-authored (rare
              // here, but safe). Recompute labelProgresses and re-apply.
              labelProgresses = PHASE_LABELS.map((name) => {
                const t = masterTl.labels[name];
                const dur = masterTl.duration();
                return dur > 0 && typeof t === 'number' ? t / dur : 0;
              });
            },
          });

          // --- Orientation + theme refresh listeners ---------------------
          // svh units re-evaluate on orientation flip; padding/shadow deltas
          // from theme toggles can nudge the pin anchor by ~1px. Schedule a
          // ScrollTrigger.refresh so anchors stay aligned in both cases.
          const orientationMql = window.matchMedia('(orientation: portrait)');
          const onOrientation = () => scheduleRefresh(150);
          orientationMql.addEventListener('change', onOrientation);

          const themeObserver = new MutationObserver(() =>
            scheduleRefresh(150),
          );
          themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
          });

          // --- Dev-only: expose trigger bounds + rail bbox for e2e -------
          // The e2e harness reads these to assert the rail is in the
          // viewport when the pin activates (rail-in-viewport check).
          if (process.env.NODE_ENV !== 'production') {
            const rail = container.querySelector<HTMLElement>(
              'nav[aria-label="How it works step rail"]',
            );
            (
              window as unknown as {
                __hiwStageTrigger?: {
                  start: number;
                  end: number;
                  stageRect: () => DOMRect;
                  railRect: () => DOMRect | null;
                  railInViewport: () => boolean;
                };
              }
            ).__hiwStageTrigger = {
              get start() {
                return st.start;
              },
              get end() {
                return st.end;
              },
              stageRect: () => stage.getBoundingClientRect(),
              railRect: () => rail?.getBoundingClientRect() ?? null,
              railInViewport: () => {
                if (!rail) return false;
                const r = rail.getBoundingClientRect();
                return r.top >= 0 && r.bottom <= window.innerHeight;
              },
            };
          }

          // --- Rail seek via Lenis scrollTo ------------------------------
          const seekToPhase = (phase: number) => {
            const lenisInstance = lenisRef.current;
            const label = PHASE_LABELS[phase];
            if (!label) return;
            const labelTime = masterTl.labels[label];
            const totalDur = masterTl.duration();
            if (typeof labelTime !== 'number' || totalDur <= 0) return;
            const labelProgress = labelTime / totalDur;
            const targetY =
              st.start + (st.end - st.start) * labelProgress;
            if (lenisInstance) {
              lenisInstance.scrollTo(targetY, {
                duration: 0.8,
                easing: (t: number) => 1 - Math.pow(1 - t, 3),
              });
            } else {
              // Fallback — if Lenis isn't initialized yet, plain scroll.
              window.scrollTo({ top: targetY, behavior: 'smooth' });
            }
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

          // --- SplitText narration chars-reveal --------------------------
          // The narration title is re-mounted per phase via React key={active};
          // we attach a MutationObserver so we re-run the char-reveal every
          // time the title element is replaced in the DOM.
          const narrTarget = () =>
            container.querySelector<HTMLElement>(
              '[data-animate="narr-title"]',
            );
          const revealNarr = () => {
            const el = narrTarget();
            if (!el) return;
            const split = SplitText.create(el, {
              type: 'chars',
              aria: 'hidden',
            });
            gsap.from(split.chars, {
              yPercent: 100,
              opacity: 0,
              stagger: 0.018,
              duration: 0.55,
              ease: 'power4.out',
              onComplete: () => {
                try {
                  split.revert();
                } catch {
                  // Element may have been swapped by React between start
                  // and onComplete — SplitText.revert is safe to miss.
                }
              },
            });
          };
          revealNarr();

          const narrationHost = container.querySelector(
            '[data-hiw-narr-host]',
          );
          let narrObserver: MutationObserver | null = null;
          if (narrationHost) {
            narrObserver = new MutationObserver(() => revealNarr());
            narrObserver.observe(narrationHost, {
              childList: true,
              subtree: true,
            });
          }

          // --- Cleanup ---------------------------------------------------
          return () => {
            cleanups.forEach((fn) => fn());
            wireFlows.forEach((tw) => tw.kill());
            narrObserver?.disconnect();
            orientationMql.removeEventListener('change', onOrientation);
            themeObserver.disconnect();
            st.kill();
            masterTl.kill();
            if (process.env.NODE_ENV !== 'production') {
              delete (
                window as unknown as {
                  __hiwStageTrigger?: unknown;
                }
              ).__hiwStageTrigger;
            }
          };
        },
      );

      // ----------------------------------------------------------------
      // Mobile (< 900px wide, no reduced-motion): per-card reveals, no pin
      // ----------------------------------------------------------------
      // Width-only gate to mirror the desktop branch. Previously this also
      // matched `(max-height: 699px)`, which caused DevTools-docked desktop
      // users to silently fall through to the mobile branch.
      mm.add(
        '(max-width: 899px) and (prefers-reduced-motion: no-preference)',
        () => {
          const triggers: ScrollTrigger[] = [];
          const cleanups: Array<() => void> = [];

          for (let n = 0; n < PHASE_COUNT; n++) {
            const card = container.querySelector<HTMLElement>(
              `[data-hiw-phase-card="${n}"]`,
            );
            if (!card) continue;
            const children = card.querySelectorAll<HTMLElement>(
              '[data-animate]',
            );
            if (children.length > 0) {
              gsap.from(children, {
                y: 30,
                opacity: 0,
                stagger: 0.1,
                duration: 0.7,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: card,
                  start: 'top 80%',
                  once: true,
                },
              });
            }

            // Dispatch phase state when card enters viewport (mobile has no
            // single shared narration so Agent D may choose to ignore this,
            // but if they reuse the ledger or narration block above the deck
            // this keeps it in sync).
            const t = ScrollTrigger.create({
              trigger: card,
              start: 'top 60%',
              end: 'bottom 40%',
              onEnter: () => dispatchPhase(n),
              onEnterBack: () => dispatchPhase(n),
            });
            triggers.push(t);
          }

          return () => {
            triggers.forEach((t) => t.kill());
            cleanups.forEach((fn) => fn());
          };
        },
      );

      // ----------------------------------------------------------------
      // Reduced-motion (both desktop & mobile)
      // ----------------------------------------------------------------
      mm.add(MATCH_MEDIA.reducedMotion, () => {
        const stage = pinHostRefRef.current.current;
        const svgRoot = stage?.querySelector('svg');
        if (svgRoot) {
          gsap.set(
            svgRoot.querySelectorAll<SVGGraphicsElement>(
              '[data-hiw^="actor-"]',
            ),
            { opacity: 1, scale: 1, transformOrigin: '50% 50%' },
          );
          const orbitsEl = svgRoot.querySelector<SVGGraphicsElement>(
            '[data-hiw="orbits"]',
          );
          if (orbitsEl) gsap.set(orbitsEl, { opacity: 1 });
          const halo = svgRoot.querySelector<SVGGraphicsElement>(
            '[data-hiw="core-halo"]',
          );
          if (halo) gsap.set(halo, { fillOpacity: 0.25 });
          const packet = svgRoot.querySelector<SVGGraphicsElement>(
            '[data-hiw="packet"]',
          );
          if (packet) {
            gsap.set(packet, {
              x: ACTOR_POSITIONS.seller.x,
              y: ACTOR_POSITIONS.seller.y,
              opacity: 0,
            });
          }
        }

        if (!stage) return;

        // Cheap dispatcher — one ScrollTrigger, nearest-of-N binning.
        const trigger = ScrollTrigger.create({
          trigger: stage,
          start: 'top 70%',
          end: 'bottom 30%',
          onUpdate(self) {
            const nearest = Math.min(
              PHASE_COUNT - 1,
              Math.round(self.progress * (PHASE_COUNT - 1)),
            );
            if (nearest !== lastPhaseRef.current) {
              dispatchPhase(nearest);
            }
          },
        });
        return () => trigger.kill();
      });

      // ---- Root useGSAP cleanup
      // useGSAP/gsap.context auto-cleans tweens + ScrollTriggers + mm
      // branches, but NOT the ResizeObserver we allocated at the root
      // of the callback. Disconnect + cancel pending rAF so HMR and
      // Next.js strict-mode double-mount don't stack observers.
      return () => {
        if (resizeRafId) cancelAnimationFrame(resizeRafId);
        resizeObserver.disconnect();
      };
    },
    { scope: containerRef, dependencies: [] },
  );

  return <div ref={containerRef}>{children}</div>;
}

// Type export for consumers/tests that need to reference the step shape.
export type { HiwStep };
