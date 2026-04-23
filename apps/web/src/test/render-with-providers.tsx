// Test helper — wraps children in ThemeProvider so components that call
// `useTheme()` don't throw "useTheme must be used within ThemeProvider"
// when tested in isolation (Header, ThemeToggle, any consumer of theme
// state). Pass { initialTheme: 'light' } to test the light palette; defaults
// to 'dark' to mirror DEFAULT_THEME. Extend the provider stack here if more
// context providers become required by marketing components (Lenis, etc.).
//
// Drop-in replacement for `render()` from @testing-library/react — returns
// the same RenderResult so tests can destructure { container, getByRole, ... }.

import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { DEFAULT_THEME, type Theme } from '@/providers/theme-bootstrap';

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialTheme?: Theme;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions,
): RenderResult {
  const { initialTheme = DEFAULT_THEME, ...rest } = options ?? {};
  return render(ui, {
    ...rest,
    wrapper: ({ children }) => (
      <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
    ),
  });
}
