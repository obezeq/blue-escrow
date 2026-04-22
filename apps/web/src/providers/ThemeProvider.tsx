'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_THEME, THEME_STORAGE_KEY, isTheme, type Theme } from './theme-bootstrap';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initial state must match between SSR and the first client render to avoid
  // hydration mismatches — so on the server we always use DEFAULT_THEME. On
  // the client, the pre-hydration script in theme-bootstrap.ts has already
  // written the resolved theme onto document.documentElement.dataset.theme
  // BEFORE React hydrates. We lazily read that value here so React state is
  // in sync from the very first render, avoiding a setState-in-effect cascade
  // (react-hooks/set-state-in-effect) and any visible theme flicker.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === 'undefined') {
      return DEFAULT_THEME;
    }
    const current = document.documentElement.dataset.theme;
    return isTheme(current) ? current : DEFAULT_THEME;
  });

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode, quota, server) — in-memory state still works.
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export type { Theme } from './theme-bootstrap';
