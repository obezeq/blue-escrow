import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { JudgePodium } from './JudgePodium';

afterEach(cleanup);

function renderInSvg() {
  return render(
    <svg>
      <JudgePodium />
    </svg>,
  );
}

describe('JudgePodium', () => {
  it('keeps data-hiw="actor-mid" so the Meet-phase opacity tween still targets it', () => {
    const { container } = renderInSvg();
    const judge = container.querySelector('[data-hiw="actor-mid"]');
    expect(judge).not.toBeNull();
  });

  it('adds data-hiw-role="judge" so dispute branches can target the new geometry', () => {
    const { container } = renderInSvg();
    const judge = container.querySelector('[data-hiw-role="judge"]');
    expect(judge).not.toBeNull();
  });

  it('renders the sticky "Can vote · Cannot withdraw" chip label', () => {
    const { container } = renderInSvg();
    const chipLabel = Array.from(container.querySelectorAll('text')).find(
      (el) => el.textContent?.includes('Can vote · Cannot withdraw'),
    );
    expect(chipLabel).toBeTruthy();
  });

  it('renders MIDDLEMAN / @archer / REP label set (no regression on actor-row labels)', () => {
    const { container } = renderInSvg();
    const texts = Array.from(container.querySelectorAll('text')).map((el) =>
      el.textContent?.trim(),
    );
    expect(texts).toContain('MIDDLEMAN');
    expect(texts).toContain('@archer');
    expect(texts?.some((t) => t?.startsWith('REP'))).toBe(true);
  });

  it('wraps the visible body in a group that consumes --hiw-judge-opacity', () => {
    // The body uses a module-scoped class name, so we assert by class presence
    // on the inner `<g>` rather than by resolved opacity (jsdom does not
    // compute CSS custom properties).
    const { container } = renderInSvg();
    const judge = container.querySelector('[data-hiw-role="judge"]');
    expect(judge).not.toBeNull();
    const body = judge?.querySelector(':scope > g');
    expect(body).not.toBeNull();
    // module-scoped class names include the BEM base
    expect(body?.getAttribute('class')).toMatch(/diagJudgeBody/);
  });
});
