/**
 * Shared SVG <defs> — gradients + filters referenced by url(#...) across
 * the diagram. Kept in one file so later commits can add vault, judge,
 * and fee-split gradients without mutating the WireNetwork or VaultCore
 * files.
 */
export function HiwDefs() {
  return (
    <defs>
      <radialGradient id="hiw-core-grad" cx="50%" cy="40%" r="60%">
        <stop offset="0" stopColor="#33AAFF" />
        <stop offset="60%" stopColor="#0066FF" />
        <stop offset="100%" stopColor="#001B4D" />
      </radialGradient>
      <filter
        id="hiw-core-glow"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
      >
        <feGaussianBlur stdDeviation="8" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="hiw-wire-grad" x1="0" x2="1">
        <stop offset="0" stopColor="#0091FF" stopOpacity="0" />
        <stop offset=".5" stopColor="#0091FF" />
        <stop offset="1" stopColor="#0091FF" stopOpacity="0" />
      </linearGradient>
      <filter
        id="hiw-packet-trail"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
      >
        <feGaussianBlur in="SourceGraphic" stdDeviation="0" />
      </filter>
      <filter
        id="hiw-core-rim"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
      >
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dx="0" dy="0" />
        <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
        <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.67  0 0 0 0 1  0 0 0 1 0" />
        <feComposite in2="SourceGraphic" operator="in" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}
