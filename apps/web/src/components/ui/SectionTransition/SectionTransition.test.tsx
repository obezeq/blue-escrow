import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SectionTransition } from './SectionTransition';

describe('SectionTransition', () => {
  it('renders with aria-hidden', () => {
    const { container } = render(
      <SectionTransition from="blue" to="white" />,
    );
    expect((container.firstChild as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  });

  it('applies default height of 200px', () => {
    const { container } = render(
      <SectionTransition from="blue" to="white" />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.height).toBe('200px');
  });

  it('accepts custom height', () => {
    const { container } = render(
      <SectionTransition from="white" to="blue" height={150} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.height).toBe('150px');
  });
});
