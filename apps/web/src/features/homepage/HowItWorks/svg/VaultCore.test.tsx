import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { VaultCore } from './VaultCore';

afterEach(cleanup);

function renderInSvg() {
  return render(
    <svg>
      <VaultCore />
    </svg>,
  );
}

describe('VaultCore — v8 hex chamber + pending-balance buckets', () => {
  it('preserves data-hiw="core" + data-hiw="core-halo" so GSAP tweens still bind', () => {
    const { container } = renderInSvg();
    expect(container.querySelector('[data-hiw="core"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="core-halo"]')).not.toBeNull();
  });

  it('adds data-hiw="core-chamber" for --hiw-vault-charge plumbing', () => {
    const { container } = renderInSvg();
    const chamber = container.querySelector('[data-hiw="core-chamber"]');
    expect(chamber).not.toBeNull();
    expect(chamber?.tagName.toLowerCase()).toBe('polygon');
  });

  it('renders three dashed output spouts (client, seller, platform)', () => {
    const { container } = renderInSvg();
    expect(container.querySelector('[data-hiw="spout-client"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="spout-seller"]')).not.toBeNull();
    expect(container.querySelector('[data-hiw="spout-platform"]')).not.toBeNull();
  });

  it('renders three pending-balance buckets keyed by recipient, hidden by default', () => {
    const { container } = renderInSvg();
    for (const id of [
      'vault-bucket-seller',
      'vault-bucket-middleman',
      'vault-bucket-platform',
    ]) {
      const bucket = container.querySelector(`[data-hiw="${id}"]`);
      expect(bucket, `bucket ${id} missing`).not.toBeNull();
      // class name is BEM-hashed by CSS Modules; substring match is enough
      expect(bucket?.getAttribute('class')).toMatch(/diagVaultBucket/);
    }
  });

  it('encodes the seller-win fee-split amounts in the bucket labels', () => {
    const { container } = renderInSvg();
    const texts = Array.from(container.querySelectorAll('text')).map((t) =>
      t.textContent?.trim(),
    );
    expect(texts).toContain('2,344.08');
    expect(texts).toContain('48.00');
    expect(texts).toContain('7.92');
  });

  it('renders the pull-based withdraw cue tied to data-hiw="vault-withdraw-cue"', () => {
    const { container } = renderInSvg();
    const cue = container.querySelector('[data-hiw="vault-withdraw-cue"]');
    expect(cue).not.toBeNull();
    expect(cue?.textContent).toMatch(/withdraw\(\)/);
  });

  it('renders the client-refund cue (fee-free outcomes) at data-hiw="vault-refund-cue"', () => {
    const { container } = renderInSvg();
    const refund = container.querySelector('[data-hiw="vault-refund-cue"]');
    expect(refund).not.toBeNull();
    expect(refund?.textContent).toMatch(/CLIENT REFUND/);
    expect(refund?.textContent).toMatch(/2,400/);
  });

  it('does NOT render the soulbound mint badge (removed as visual noise)', () => {
    const { container } = renderInSvg();
    const soulbound = container.querySelector(
      '[data-hiw="vault-soulbound-cue"]',
    );
    expect(soulbound).toBeNull();
  });

  it('keeps the v7 "SMART CONTRACT / Escrow #4821" labels (no regression)', () => {
    const { container } = renderInSvg();
    const texts = Array.from(container.querySelectorAll('text')).map((t) =>
      t.textContent?.trim(),
    );
    expect(texts).toContain('SMART CONTRACT');
    expect(texts).toContain('Escrow #4821');
  });
});
