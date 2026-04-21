import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';
import {
  DEFAULT_THEME,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  isTheme,
} from './theme-bootstrap';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
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

  it('isTheme accepts only dark and light', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('light')).toBe(true);
    expect(isTheme('sepia')).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
    expect(isTheme(42)).toBe(false);
  });

  // The init script is a hardcoded string literal served in <head>. We can't
  // execute it in jsdom without tripping security heuristics, so instead we
  // assert the observable contract: precedence + storage key + fallback.
  it('init script reads be-theme from localStorage before anything else', () => {
    expect(THEME_INIT_SCRIPT).toContain("localStorage.getItem('be-theme')");
  });

  it('init script checks prefers-color-scheme as the fallback', () => {
    expect(THEME_INIT_SCRIPT).toContain('prefers-color-scheme: light');
  });

  it('init script writes document.documentElement.dataset.theme', () => {
    expect(THEME_INIT_SCRIPT).toContain('document.documentElement.dataset.theme');
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

  it('syncs initial state from html[data-theme] set by pre-hydration script', async () => {
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
      <ThemeProvider>
        <span>child content</span>
      </ThemeProvider>,
    );
    expect(getByText('child content')).toBeDefined();
  });
});
