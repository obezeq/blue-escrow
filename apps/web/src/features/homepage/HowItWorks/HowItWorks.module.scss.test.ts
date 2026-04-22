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
 */
function blockFor(selector: string): string {
  const start = scss.indexOf(selector);
  if (start < 0) {
    throw new Error(
      `Selector not found in HowItWorks.module.scss: ${selector}`,
    );
  }
  const openIdx = scss.indexOf('{', start);
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
