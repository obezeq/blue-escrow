import styles from './HowItWorks.module.scss';

/**
 * Mobile phase-card mini SVG for "How It Works".
 *
 * Each phase renders a simplified, static composition of the main
 * `HiwDiagram` — intended to sit above the narration text inside each
 * mobile step card. No GSAP / no animation; card-level reveals are
 * handled by the parent scroll trigger in `HowItWorksAnimations`.
 *
 * viewBox `0 0 480 320` = 2:1 to fit comfortably above mobile narration.
 * Palette mirrors the desktop diagram: `#0091FF`, `#0066FF`, `#001B4D`,
 * `#071230`, `#213B78`; text tokens use `var(--muted-2)` / `var(--text)`
 * so labels respect theme in light/dark.
 */

// Local phase-index type — keep aligned with `HiwStep.index` from steps.tsx.
// Agent D will re-export this as `PhaseIndex` from steps.tsx; this file
// intentionally uses the literal union to avoid creating a cross-file
// dependency ahead of Agent D's write.
type PhaseIndex = 0 | 1 | 2 | 3 | 4;

interface HiwPhaseDiagramProps {
  phase: PhaseIndex;
}

export function HiwPhaseDiagram({ phase }: HiwPhaseDiagramProps) {
  return (
    <svg
      className={styles.hiw__miniDiagram}
      viewBox="0 0 480 320"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {phase === 0 && <PhaseMeet />}
      {phase === 1 && <PhaseSign />}
      {phase === 2 && <PhaseLock />}
      {phase === 3 && <PhaseDeliver />}
      {phase === 4 && <PhaseRelease />}
    </svg>
  );
}

/* ---------- Local shared fragments ------------------------------------- */

// Simplified actor puck: circle + role label below. Icon is drawn by `children`.
function MiniActor({
  x,
  y,
  label,
  opacity = 1,
  children,
}: {
  x: number;
  y: number;
  label: string;
  opacity?: number;
  children: React.ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <circle r="30" fill="#071230" stroke="#213B78" strokeWidth="1" />
      <circle
        r="36"
        fill="none"
        stroke="#0091FF"
        strokeOpacity=".3"
        strokeDasharray="2 4"
      />
      <g
        stroke="#0091FF"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
      <text
        y="52"
        textAnchor="middle"
        fontFamily="Geist Mono, ui-monospace"
        fontSize="9"
        fill="var(--muted-2)"
        letterSpacing="1.5"
      >
        {label}
      </text>
    </g>
  );
}

// Icon primitives reused across phases (same glyphs as the big diagram, scaled).
const ClientIcon = (
  <path d="M 0 -10 L -9 -5 V 4 C -9 10 -5 14 0 15 C 5 14 9 10 9 4 V -5 Z" />
);
const MidIcon = (
  <>
    <path d="M 0 -11 L 10 -6 V 5 L 0 13 L -10 5 V -6 Z" />
    <path d="M -10 -1 L 10 -1" />
  </>
);
const SellerIcon = (
  <>
    <path d="M -9 -7 H 9 L 12 9 A 1.3 1.3 0 0 1 10 10 H -10 A 1.3 1.3 0 0 1 -12 9 Z" />
    <path d="M -4 -7 V -11 A 4 4 0 0 1 4 -11 V -7" />
  </>
);

// Core disc (small, mobile-appropriate). `haloOpacity` controls the glow intensity.
function MiniCore({
  cx,
  cy,
  haloOpacity = 0,
  released = false,
}: {
  cx: number;
  cy: number;
  haloOpacity?: number;
  released?: boolean;
}) {
  return (
    <g>
      {haloOpacity > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r="60"
          fill="#0091FF"
          fillOpacity={haloOpacity}
        />
      )}
      {released && (
        <circle
          cx={cx}
          cy={cy}
          r="72"
          fill="none"
          stroke="#33AAFF"
          strokeOpacity=".55"
          strokeDasharray="3 5"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r="44"
        fill="none"
        stroke="#0091FF"
        strokeOpacity=".5"
        strokeDasharray="3 4"
      />
      <circle
        cx={cx}
        cy={cy}
        r="30"
        fill="url(#hiw-core-grad)"
        stroke="#0091FF"
        strokeWidth="1"
      />
      <g
        transform={`translate(${cx} ${cy})`}
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="-8" y="-2" width="16" height="11" rx="2" />
        <path d="M -5 -2 V -6 A 5 5 0 0 1 5 -6 V -2" />
      </g>
    </g>
  );
}

// Money packet (simplified pill with amount), used in phases 2 and 4.
function MiniPacket({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x="-22"
        y="-11"
        width="44"
        height="22"
        rx="11"
        fill="#fff"
        stroke="#0091FF"
        strokeWidth="1.3"
      />
      <text
        textAnchor="middle"
        y="4"
        fontFamily="Geist Mono, ui-monospace"
        fontSize="9"
        fill="#001B4D"
        fontWeight="700"
      >
        $2,400
      </text>
    </g>
  );
}

// Core gradient definition — re-declared locally so this file is standalone.
const MiniDefs = (
  <defs>
    <radialGradient id="hiw-core-grad" cx="50%" cy="40%" r="60%">
      <stop offset="0" stopColor="#33AAFF" />
      <stop offset="60%" stopColor="#0066FF" />
      <stop offset="100%" stopColor="#001B4D" />
    </radialGradient>
  </defs>
);

/* ---------- Phase fragments -------------------------------------------- */

// Actor positions tuned for the 480×320 box.
const CLIENT = { x: 80, y: 180 };
const MID = { x: 240, y: 80 };
const SELLER = { x: 400, y: 180 };
const CORE = { x: 240, y: 190 };

function PhaseMeet() {
  // 3 actor pucks introduce themselves — no core, no wires.
  return (
    <>
      {MiniDefs}
      <MiniActor x={CLIENT.x} y={CLIENT.y} label="CLIENT">
        {ClientIcon}
      </MiniActor>
      <MiniActor x={MID.x} y={MID.y} label="MIDDLEMAN">
        {MidIcon}
      </MiniActor>
      <MiniActor x={SELLER.x} y={SELLER.y} label="SELLER">
        {SellerIcon}
      </MiniActor>
    </>
  );
}

function PhaseSign() {
  // All three wires lit at 40% — terms signed.
  return (
    <>
      {MiniDefs}
      <g
        stroke="#0091FF"
        strokeOpacity="0.4"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        fill="none"
      >
        <path d={`M ${CLIENT.x + 26} ${CLIENT.y - 6} Q 160 200 ${CORE.x - 30} ${CORE.y}`} />
        <path d={`M ${MID.x} ${MID.y + 28} Q ${MID.x} 130 ${CORE.x} ${CORE.y - 28}`} />
        <path d={`M ${SELLER.x - 26} ${SELLER.y - 6} Q 320 200 ${CORE.x + 30} ${CORE.y}`} />
      </g>
      <MiniCore cx={CORE.x} cy={CORE.y} haloOpacity={0.15} />
      <MiniActor x={CLIENT.x} y={CLIENT.y} label="CLIENT">
        {ClientIcon}
      </MiniActor>
      <MiniActor x={MID.x} y={MID.y} label="MIDDLEMAN">
        {MidIcon}
      </MiniActor>
      <MiniActor x={SELLER.x} y={SELLER.y} label="SELLER">
        {SellerIcon}
      </MiniActor>
    </>
  );
}

function PhaseLock() {
  // Client + core only. Wire C lit. Packet at core.
  return (
    <>
      {MiniDefs}
      <path
        d={`M ${CLIENT.x + 26} ${CLIENT.y - 6} Q 160 180 ${CORE.x - 30} ${CORE.y}`}
        stroke="#0091FF"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <MiniCore cx={CORE.x} cy={CORE.y} haloOpacity={0.4} />
      <MiniActor x={CLIENT.x} y={CLIENT.y} label="CLIENT">
        {ClientIcon}
      </MiniActor>
      <MiniPacket x={CORE.x} y={CORE.y} />
    </>
  );
}

function PhaseDeliver() {
  // Core + seller highlighted; client & middleman dimmed.
  return (
    <>
      {MiniDefs}
      <path
        d={`M ${SELLER.x - 26} ${SELLER.y - 6} Q 320 180 ${CORE.x + 30} ${CORE.y}`}
        stroke="#0091FF"
        strokeOpacity="0.5"
        strokeWidth="1.8"
        strokeDasharray="4 5"
        fill="none"
        strokeLinecap="round"
      />
      <MiniCore cx={CORE.x} cy={CORE.y} haloOpacity={0.32} />
      <MiniActor x={CLIENT.x} y={CLIENT.y} label="CLIENT" opacity={0.35}>
        {ClientIcon}
      </MiniActor>
      <MiniActor x={MID.x} y={MID.y} label="MIDDLEMAN" opacity={0.35}>
        {MidIcon}
      </MiniActor>
      <MiniActor x={SELLER.x} y={SELLER.y} label="SELLER">
        {SellerIcon}
      </MiniActor>
    </>
  );
}

function PhaseRelease() {
  // Core + seller. Wire S lit bright. Packet at seller. Small released glow.
  return (
    <>
      {MiniDefs}
      <path
        d={`M ${CORE.x + 30} ${CORE.y} Q 320 180 ${SELLER.x - 26} ${SELLER.y - 6}`}
        stroke="#0091FF"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <MiniCore cx={CORE.x} cy={CORE.y} haloOpacity={0.5} released />
      <MiniActor x={SELLER.x} y={SELLER.y} label="SELLER">
        {SellerIcon}
      </MiniActor>
      <MiniPacket x={SELLER.x} y={SELLER.y} />
    </>
  );
}
