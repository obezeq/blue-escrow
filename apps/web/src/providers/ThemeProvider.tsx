'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  THEME_COOKIE_MAX_AGE,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  isTheme,
  type Theme,
} from './theme-bootstrap';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

// S11 — Wrap theme-swap mutations in document.startViewTransition so the
// browser captures before/after snapshots and animates a root crossfade.
// The callback runs synchronously and MUST contain all DOM changes
// (dataset + localStorage + cookie) for the browser to diff correctly.
// The returned ViewTransition instance is intentionally ignored — we don't
// need to await `finished` and Next.js's React 19 runtime prefers
// fire-and-forget here. Animation tuning lives in utilities/_view-transitions.scss.
//
// TypeScript 5.4+ ships ambient types for the View Transitions API via lib.dom
// (`Document.startViewTransition` is optional), so feature detection with
// typeof is enough — no custom declaration or `any` cast required.
function runThemeTransition(apply: () => void): void {
  if (typeof document === 'undefined') {
    apply();
    return;
  }
  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(apply);
    return;
  }
  apply();
}

function persistTheme(next: Theme): void {
  document.documentElement.dataset.theme = next;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // localStorage unavailable (private mode, quota) — cookie still works.
  }
  document.cookie = `${THEME_COOKIE_NAME}=${next}; Max-Age=${THEME_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: ReactNode;
}) {
  // initialTheme is resolved server-side from the `be-theme` cookie by the
  // root layout. Server and client now render identical output on first paint,
  // eliminating the ThemeToggle `aria-checked` / `aria-label` mismatch.
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  // First-visit reconciliation — only fires when no cookie existed at SSR
  // time and the pre-hydration script (theme-bootstrap.ts) has just resolved
  // the theme from `prefers-color-scheme` and written it to `dataset.theme`
  // + cookie. Sync React state once so `ThemeToggle.aria-checked` matches
  // the DOM theme. Guarded with a ref so it never re-runs on subsequent
  // state changes — this is a bounded one-shot DOM→React sync, not a
  // cascading update loop, so the setState-in-effect rule doesn't apply.
  const didReconcileRef = useRef(false);
  useEffect(() => {
    if (didReconcileRef.current) return;
    didReconcileRef.current = true;
    const resolved = document.documentElement.dataset.theme;
    if (isTheme(resolved) && resolved !== theme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- guarded one-shot DOM→state sync for first-visit path; never cascades
      setThemeState(resolved);
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    runThemeTransition(() => {
      setThemeState(next);
      persistTheme(next);
    });
  }, []);

  const toggle = useCallback(() => {
    runThemeTransition(() => {
      setThemeState((prev) => {
        const next: Theme = prev === 'dark' ? 'light' : 'dark';
        persistTheme(next);
        return next;
      });
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
