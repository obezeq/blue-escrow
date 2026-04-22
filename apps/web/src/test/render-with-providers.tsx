// Test helper — wraps children in ThemeProvider so components that call
// `useTheme()` don't throw "useTheme must be used within ThemeProvider"
// when tested in isolation (Header, ThemeToggle, any consumer of theme
// state). Extend the provider stack here if more context providers become
// required by marketing components (e.g. Lenis, WalletConnect).
//
// Drop-in replacement for `render()` from @testing-library/react — returns
// the same RenderResult so tests can destructure { container, getByRole, ... }.

import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@/providers/ThemeProvider';

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, {
    ...options,
    wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
  });
}
