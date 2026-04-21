import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

function renderWithProvider() {
  return render(
    <ThemeProvider>
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
      <ThemeProvider>
        <ThemeToggle className="custom-extra" />
      </ThemeProvider>,
    );
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('custom-extra');
  });
});
