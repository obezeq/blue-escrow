import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';
import {
  DEFAULT_THEME,
  THEME_COOKIE_MAX_AGE,
  THEME_COOKIE_NAME,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  isTheme,
  parseThemeCookie,
} from './theme-bootstrap';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider initialTheme="dark">{children}</ThemeProvider>;
}

function lightWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider initialTheme="light">{children}</ThemeProvider>;
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('theme-bootstrap constants', () => {
  it('defaults to dark', () => {
    expect(DEFAULT_THEME).toBe('dark');
  });

  it('names the storage key', () => {
    expect(THEME_STORAGE_KEY).toBe('be-theme');
  });

  it('names the cookie + exposes a 1y max-age', () => {
    expect(THEME_COOKIE_NAME).toBe('be-theme');
    expect(THEME_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
  });

  it('isTheme accepts only dark and light', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('light')).toBe(true);
    expect(isTheme('sepia')).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
    expect(isTheme(42)).toBe(false);
  });

  it('parseThemeCookie returns the Theme for valid values, null otherwise', () => {
    expect(parseThemeCookie('dark')).toBe('dark');
    expect(parseThemeCookie('light')).toBe('light');
    expect(parseThemeCookie('hack')).toBeNull();
    expect(parseThemeCookie('')).toBeNull();
    expect(parseThemeCookie(undefined)).toBeNull();
    expect(parseThemeCookie(null)).toBeNull();
  });

  // The init script is a hardcoded string literal served in <head>. We can't
  // execute it in jsdom without tripping security heuristics, so instead we
  // assert the observable contract: precedence + cookie write + fallback.
  it('init script reads the be-theme cookie first (SSR-aligned precedence)', () => {
    // Cookie regex must appear before any localStorage access so the script
    // exits early when the server already knew the theme — keeps returning
    // visits mismatch-free without paying the localStorage read.
    const cookieIdx = THEME_INIT_SCRIPT.indexOf('document.cookie');
    const storageIdx = THEME_INIT_SCRIPT.indexOf('localStorage.getItem');
    expect(cookieIdx).toBeGreaterThan(-1);
    expect(storageIdx).toBeGreaterThan(-1);
    expect(cookieIdx).toBeLessThan(storageIdx);
  });

  it('init script falls back to localStorage for pre-cookie visitors', () => {
    expect(THEME_INIT_SCRIPT).toContain("localStorage.getItem('be-theme')");
  });

  it('init script checks prefers-color-scheme as the last dynamic fallback', () => {
    expect(THEME_INIT_SCRIPT).toContain('prefers-color-scheme: light');
  });

  it('init script captures documentElement and writes dataset.theme', () => {
    expect(THEME_INIT_SCRIPT).toContain('var d=document.documentElement');
    expect(THEME_INIT_SCRIPT).toContain('d.dataset.theme');
  });

  it('init script persists the resolved theme to a SameSite=Lax cookie', () => {
    expect(THEME_INIT_SCRIPT).toContain('SameSite=Lax');
    expect(THEME_INIT_SCRIPT).toContain('Max-Age=31536000');
    expect(THEME_INIT_SCRIPT).toContain('Path=/');
  });

  it('init script defaults to dark when nothing else matches', () => {
    expect(THEME_INIT_SCRIPT).toContain("'dark'");
  });
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = 'dark';
  });

  it('exposes the current theme through useTheme', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});
    expect(result.current.theme).toBe('dark');
  });

  it('setTheme writes html[data-theme] and localStorage', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});
    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('toggle flips between dark and light', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});
    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('syncs initial state from initialTheme prop (SSR-aligned first render)', async () => {
    // Simulate the production flow: SSR shipped <html data-theme="light">
    // and ThemeProvider received initialTheme="light". The reconcile effect
    // should see matching state, leaving theme at 'light'.
    document.documentElement.dataset.theme = 'light';
    const { result } = renderHook(() => useTheme(), { wrapper: lightWrapper });
    await act(async () => {});
    expect(result.current.theme).toBe('light');
  });

  it('reconciles state on mount when dataset.theme was set by pre-hydration script', async () => {
    document.documentElement.dataset.theme = 'light';
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});
    expect(result.current.theme).toBe('light');
  });

  it('useTheme throws when used outside ThemeProvider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
  });

  it('persists the chosen theme across re-renders of the same hook', async () => {
    const { result, rerender } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});
    act(() => {
      result.current.setTheme('light');
    });
    rerender();
    expect(result.current.theme).toBe('light');
  });

  it('renders children inside the provider', () => {
    const { getByText } = render(
      <ThemeProvider initialTheme="dark">
        <span>child content</span>
      </ThemeProvider>,
    );
    expect(getByText('child content')).toBeDefined();
  });
});
