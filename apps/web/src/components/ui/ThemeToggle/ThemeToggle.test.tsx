import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

function renderWithProvider(initialTheme: 'dark' | 'light' = 'dark') {
  return render(
    <ThemeProvider initialTheme={initialTheme}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = 'dark';
  });

  afterEach(() => {
    cleanup();
  });

  it('renders as an accessible switch', () => {
    renderWithProvider();
    const btn = screen.getByRole('switch');
    expect(btn).toBeDefined();
    expect(btn.getAttribute('aria-label')?.toLowerCase()).toContain('light');
  });

  it('starts with aria-checked=false when theme is dark', async () => {
    renderWithProvider();
    await act(async () => {});
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
  });

  it('renders aria-checked=true synchronously with initialTheme=light (SSR-aligned)', () => {
    // No act/await — the check runs before any effect flush to prove that
    // the first render ships the correct ARIA state. This is the exact
    // contract the cookie-driven SSR theming is designed to guarantee:
    // server HTML === client first render, zero hydration mismatch.
    document.documentElement.dataset.theme = 'light';
    renderWithProvider('light');
    const btn = screen.getByRole('switch');
    expect(btn.getAttribute('aria-checked')).toBe('true');
    expect(btn.getAttribute('aria-label')?.toLowerCase()).toContain('dark');
  });

  it('toggles theme to light and writes data-theme + localStorage', () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole('switch'));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('be-theme')).toBe('light');
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('toggles back to dark on second click', () => {
    renderWithProvider();
    const btn = screen.getByRole('switch');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('be-theme')).toBe('dark');
  });

  it('accepts a className prop appended to the base class', () => {
    const { container } = render(
      <ThemeProvider initialTheme="dark">
        <ThemeToggle className="custom-extra" />
      </ThemeProvider>,
    );
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('custom-extra');
  });
});
