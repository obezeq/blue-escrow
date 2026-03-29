import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock the client animation wrapper
vi.mock('./TrustLayerAnimations', () => ({
  TrustLayerAnimations: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { TrustLayer } from './TrustLayer';

afterEach(() => cleanup());

describe('TrustLayer', () => {
  it('renders the Solidity function signature', () => {
    render(<TrustLayer />);
    const codeBlock = document.querySelector('code');
    expect(codeBlock?.textContent).toContain('function');
    expect(codeBlock?.textContent).toContain('resolve');
  });

  it('renders the middleman require check', () => {
    render(<TrustLayer />);
    const codeBlock = document.querySelector('code');
    expect(codeBlock?.textContent).toContain('msg.sender == middleman');
  });

  it('renders the key require line', () => {
    render(<TrustLayer />);
    const codeBlock = document.querySelector('code');
    expect(codeBlock?.textContent).toContain(
      'require(to == client || to == seller)',
    );
  });

  it('renders the trust comments', () => {
    render(<TrustLayer />);
    const codeBlock = document.querySelector('code');
    expect(codeBlock?.textContent).toContain(
      'NEVER to the middleman. Ever.',
    );
  });

  it('uses semantic pre and code elements', () => {
    const { container } = render(<TrustLayer />);
    const pre = container.querySelector('pre');
    const code = container.querySelector('code');
    expect(pre).not.toBeNull();
    expect(code).not.toBeNull();
    expect(pre?.contains(code!)).toBe(true);
  });

  it('renders all four stat values', () => {
    render(<TrustLayer />);
    expect(screen.getByText('0.33%')).toBeDefined();
    expect(screen.getByText('$0')).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined();
    expect(screen.getByText('33 days')).toBeDefined();
  });

  it('renders all four stat captions', () => {
    render(<TrustLayer />);
    expect(screen.getByText('Platform fee')).toBeDefined();
    expect(screen.getByText('Middleman can take')).toBeDefined();
    expect(screen.getByText('On-chain transparency')).toBeDefined();
    expect(screen.getByText('Security audit')).toBeDefined();
  });

  it('renders as a semantic section with correct id', () => {
    const { container } = render(<TrustLayer />);
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section?.id).toBe('trust-layer');
  });

  it('has o-section--white class for white background', () => {
    const { container } = render(<TrustLayer />);
    const section = container.querySelector('section');
    expect(section?.className).toContain('o-section--white');
  });

  it('has aria-label on the section', () => {
    const { container } = render(<TrustLayer />);
    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe(
      'Trust and transparency',
    );
  });

  it('marks the key line with data-highlight attribute', () => {
    const { container } = render(<TrustLayer />);
    const keyLine = container.querySelector('[data-highlight="key-line"]');
    expect(keyLine).not.toBeNull();
    expect(keyLine?.textContent).toContain('require');
    expect(keyLine?.textContent).toContain('client');
    expect(keyLine?.textContent).toContain('seller');
  });
});
