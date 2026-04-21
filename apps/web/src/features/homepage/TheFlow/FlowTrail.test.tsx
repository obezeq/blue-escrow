import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { createRef } from 'react';

import { FlowTrail, type FlowTrailHandle } from './FlowTrail';

afterEach(() => cleanup());

describe('FlowTrail', () => {
  it('renders an SVG with role="img" and aria-label', () => {
    render(<FlowTrail />);
    const svg = screen.getByRole('img', {
      name: 'Money flows from buyer through smart contract to seller',
    });
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
  });

  it('renders buyer, contract, and seller node labels', () => {
    render(<FlowTrail />);
    expect(screen.getByText('Buyer')).toBeDefined();
    expect(screen.getByText('Smart Contract')).toBeDefined();
    expect(screen.getByText('Seller')).toBeDefined();
  });

  it('renders the middleman node as disconnected', () => {
    render(<FlowTrail />);
    expect(screen.getByText('Middleman')).toBeDefined();

    const { container } = render(<FlowTrail />);
    const dashedLine = container.querySelector(
      '[data-node="middleman"] line',
    );
    expect(dashedLine).not.toBeNull();
    expect(dashedLine?.getAttribute('stroke-dasharray')).toBe('6 4');
  });

  it('renders the trail path element', () => {
    const { container } = render(<FlowTrail />);
    const path = container.querySelector('[data-animate="trail-path"]');
    expect(path).not.toBeNull();
    expect(path?.tagName).toBe('path');
  });

  it('renders the glowing particle', () => {
    const { container } = render(<FlowTrail />);
    const particle = container.querySelector('[data-animate="particle"]');
    expect(particle).not.toBeNull();
    expect(particle?.tagName).toBe('circle');
  });

  it('renders the checkmark group hidden initially', () => {
    const { container } = render(<FlowTrail />);
    const checkmark = container.querySelector('[data-animate="checkmark"]');
    expect(checkmark).not.toBeNull();
    expect(checkmark?.getAttribute('opacity')).toBe('0');
  });

  it('renders the fee label hidden initially', () => {
    const { container } = render(<FlowTrail />);
    const fee = container.querySelector('[data-animate="fee"]');
    expect(fee).not.toBeNull();
    expect(fee?.getAttribute('opacity')).toBe('0');
    expect(fee?.textContent).toBe('0.33% fee');
  });

  it('exposes element refs via forwardRef handle', () => {
    const ref = createRef<FlowTrailHandle>();
    render(<FlowTrail ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.svgEl).not.toBeNull();
    expect(ref.current?.trailPath).not.toBeNull();
    expect(ref.current?.particle).not.toBeNull();
    expect(ref.current?.contractGlow).not.toBeNull();
    expect(ref.current?.checkmark).not.toBeNull();
    expect(ref.current?.feeLabel).not.toBeNull();
  });

  it('contains a gradient definition for the trail', () => {
    const { container } = render(<FlowTrail />);
    const gradient = container.querySelector('#trail-gradient');
    expect(gradient).not.toBeNull();
  });
});
