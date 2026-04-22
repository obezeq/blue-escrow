import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Static analysis over the SCSS source: the Preloader must remain
// theme-invariant. It may reference brand-invariant tokens and literal
// whites; it must NOT reference theme-sensitive tokens that flip when
// <html data-theme> changes.

const dir = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  resolve(dir, 'Preloader.module.scss'),
  'utf8',
);

const WHITELIST = [
  /--blue-primary\b/,
  /--blue-vivid\b/,
  /--blue-ink\b/,
  /#fff\b/,
] as const;

const BLACKLIST = [
  /--bg-page\b/,
  /--bg-surface\b/,
  /--bg-tint\b/,
  /\bvar\(--text(?!-)[^-]/, // Allow --text-soft style local tokens; reject --text
  /\bvar\(--text-muted\b/,
  /\bvar\(--accent\b/,
  /\bvar\(--border\b/,
  /\bvar\(--on-card\b/,
  /\bvar\(--on-border\b/,
] as const;

describe('Preloader.module.scss — theme invariance', () => {
  it.each(WHITELIST)('uses the brand-invariant token or literal %s', (re) => {
    expect(css).toMatch(re);
  });

  it.each(BLACKLIST)('does not consume the theme-sensitive token %s', (re) => {
    expect(css).not.toMatch(re);
  });

  it('registers @property --gradient-angle with <angle> syntax', () => {
    expect(css).toMatch(/@property\s+--gradient-angle/);
    expect(css).toMatch(/syntax:\s*['"]<angle>['"]/);
  });

  it('registers @property --progress with <number> syntax', () => {
    expect(css).toMatch(/@property\s+--progress/);
    expect(css).toMatch(/syntax:\s*['"]<number>['"]/);
  });

  it('drives the progress fill via transform: scaleX (GPU-only)', () => {
    expect(css).toMatch(/transform:\s*scaleX\(var\(--progress[^)]*\)\)/);
  });

  it('pins z-index to the --z-preloader-overlay token (not a magic number)', () => {
    expect(css).toMatch(/z-index:\s*var\(--z-preloader-overlay\)/);
    expect(css).not.toMatch(/z-index:\s*9990/);
  });

  it('honors prefers-reduced-motion with a dedicated media query', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
