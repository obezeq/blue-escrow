// Register vitest-axe's custom matchers with Vitest's Assertion interface so
// `expect(result).toHaveNoViolations()` type-checks in our test files.

import 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers {
    // T is carried by the generic; vitest-axe's matcher is value-agnostic.
    _axe?: T;
  }
  interface AsymmetricMatchersContaining extends AxeMatchers {
    _axeAsymmetric?: unknown;
  }
}
