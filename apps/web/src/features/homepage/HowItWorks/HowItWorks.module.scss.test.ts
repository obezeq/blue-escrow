import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

// Resolve the sibling SCSS file via __dirname — avoids jsdom's handling of
// `import.meta.url` which resolves to an http: URL under the test environment.
const scssPath = path.resolve(__dirname, 'HowItWorks.module.scss');
const scss = readFileSync(scssPath, 'utf8');

/**
 * Extract the body of a selector (or @keyframes block) by matching balanced
 * braces. Returns the inner content (without the enclosing {}).
 *
 * Skips occurrences inside // single-line or /* block *\/ comments so a
 * class name mentioned in a comment (e.g. "`.hiw__diagWire` was orphaned")
 * does not capture the wrong rule body. Only top-level (column-0) matches
 * are considered so the search lands on the canonical selector definition.
 */
function blockFor(selector: string): string {
  const lines = scss.split('\n');
  let inBlockComment = false;
  let absStart = -1;
  let offset = 0;
  for (const line of lines) {
    let trimmed = line;
    // strip /* ... */ spans
    while (true) {
      if (inBlockComment) {
        const end = trimmed.indexOf('*/');
        if (end < 0) { trimmed = ''; break; }
        trimmed = trimmed.slice(end + 2);
        inBlockComment = false;
      } else {
        const open = trimmed.indexOf('/*');
        if (open < 0) break;
        const before = trimmed.slice(0, open);
        const rest = trimmed.slice(open + 2);
        const close = rest.indexOf('*/');
        if (close < 0) {
          trimmed = before;
          inBlockComment = true;
          break;
        }
        trimmed = before + rest.slice(close + 2);
      }
    }
    // strip // single-line comment
    const slashSlash = trimmed.indexOf('//');
    if (slashSlash >= 0) trimmed = trimmed.slice(0, slashSlash);
    const stripped = trimmed.trimStart();
    if (stripped.startsWith(selector)) {
      const afterSel = stripped.slice(selector.length);
      if (/^(\s|\{)/.test(afterSel)) {
        const leading = line.length - line.trimStart().length;
        absStart = offset + leading;
        break;
      }
    }
    offset += line.length + 1;
  }
  if (absStart < 0) {
    throw new Error(
      `Selector not found in HowItWorks.module.scss: ${selector}`,
    );
  }
  const openIdx = scss.indexOf('{', absStart);
  if (openIdx < 0) {
    throw new Error(`Missing opening brace for: ${selector}`);
  }
  let depth = 1;
  let i = openIdx + 1;
  for (; i < scss.length && depth > 0; i++) {
    const ch = scss[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  return scss.slice(openIdx + 1, i - 1);
}

// Whitelist: specular white highlight is theme-invariant (pure white at 20%
// alpha is the canonical glass-reflection baseline — doesn't change in
// dark/light themes).
const ALLOWED_LITERALS: RegExp[] = [
  /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.2\s*\)/g,
];

function stripAllowed(body: string): string {
  return ALLOWED_LITERALS.reduce((b, rx) => b.replace(rx, ''), body);
}

describe('HowItWorks.module.scss — theme token discipline', () => {
  it('.hiw__coreDisc has no non-whitelisted rgba() literals', () => {
    const body = blockFor('.hiw__coreDisc');
    const cleaned = stripAllowed(body);
    // Match rgba(<digit ...) which catches any numeric-first rgba() call.
    expect(cleaned).not.toMatch(/rgba\(\s*\d/);
  });

  it('@keyframes hiwCorePulse has no non-whitelisted rgba() literals', () => {
    const body = blockFor('@keyframes hiwCorePulse');
    const cleaned = stripAllowed(body);
    expect(cleaned).not.toMatch(/rgba\(\s*\d/);
  });

  it('.hiw__coreDisc references --core-glow-ring and --core-glow-halo tokens', () => {
    const body = blockFor('.hiw__coreDisc');
    expect(body).toMatch(/var\(--core-glow-ring\)/);
    expect(body).toMatch(/var\(--core-glow-halo\)/);
  });

  it('@keyframes hiwCorePulse references --core-glow-ring and --core-glow-ring-strong', () => {
    const body = blockFor('@keyframes hiwCorePulse');
    expect(body).toMatch(/var\(--core-glow-ring\)/);
    expect(body).toMatch(/var\(--core-glow-ring-strong\)/);
  });
});

// ---------------------------------------------------------------------------
// SVG Diagram selectors — refs #99.
// HiwDiagram.tsx references these CSS Module classes on every <text>, <circle>,
// and <path> in the SVG. If the selector is missing, the browser defaults SVG
// `<text>` to `fill: black` — invisible in dark mode. Guard against silent
// regression by asserting each selector exists AND uses a design token (not a
// hardcoded color literal).
// ---------------------------------------------------------------------------

describe('HowItWorks.module.scss — SVG diagram selectors (refs #99)', () => {
  it.each([
    '.hiw__diagActorPuck',
    '.hiw__diagActorRole',
    '.hiw__diagActorText',
    '.hiw__diagActorMuted',
    '.hiw__diagWire',
  ])('defines %s so the SVG text is not invisible in dark mode', (sel) => {
    expect(() => blockFor(sel)).not.toThrow();
  });

  it('.hiw__diagActorPuck fills with --hiw-actor-bg and strokes with --hiw-actor-border', () => {
    const body = blockFor('.hiw__diagActorPuck');
    expect(body).toMatch(/fill:\s*var\(--hiw-actor-bg\)/);
    expect(body).toMatch(/stroke:\s*var\(--hiw-actor-border\)/);
  });

  it('.hiw__diagActorRole fills with a role-label token and uses fluid cqi sizing', () => {
    const body = blockFor('.hiw__diagActorRole');
    expect(body).toMatch(/fill:\s*var\(--hiw-role-label\)/);
    expect(body).toMatch(/clamp\([^)]*cqi[^)]*\)/);
  });

  it('.hiw__diagActorText fills with the actor-name token (high contrast primary)', () => {
    const body = blockFor('.hiw__diagActorText');
    expect(body).toMatch(/fill:\s*var\(--hiw-actor-name\)/);
    expect(body).toMatch(/clamp\([^)]*cqi[^)]*\)/);
  });

  it('.hiw__diagActorMuted fills with the actor-wallet token', () => {
    const body = blockFor('.hiw__diagActorMuted');
    expect(body).toMatch(/fill:\s*var\(--hiw-actor-wallet\)/);
  });

  it('.hiw__diagWire strokes with --hiw-wire-base', () => {
    const body = blockFor('.hiw__diagWire');
    expect(body).toMatch(/stroke:\s*var\(--hiw-wire-base\)/);
  });

  it('.hiw__sceneBody sets container-type: inline-size so SVG cqi resolves', () => {
    const body = blockFor('.hiw__sceneBody');
    expect(body).toMatch(/container-type:\s*inline-size/);
  });

  it('no hard-coded hex / rgb color in the diag* selectors', () => {
    const selectors = [
      '.hiw__diagActorPuck',
      '.hiw__diagActorRole',
      '.hiw__diagActorText',
      '.hiw__diagActorMuted',
      '.hiw__diagWire',
    ];
    for (const sel of selectors) {
      const body = blockFor(sel);
      expect(body).not.toMatch(/#[0-9a-f]{3,6}\b/i);
      expect(body).not.toMatch(/rgba?\(\s*\d/);
    }
  });
});
