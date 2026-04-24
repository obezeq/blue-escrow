import { ImageResponse } from 'next/og';

// Twitter-specific variant of the file-based OG resolver. Kept in lockstep
// with opengraph-image.tsx: Twitter renders its own card preview and, while
// the summary_large_image format is visually identical at 1200x630, having a
// dedicated file lets us diverge later (tighter type hierarchy, focused CTA,
// handle-only watermark) without touching the canonical og:image resolver.
//
// Next auto-picks this up for twitter:image metadata — any manual
// `twitter.images` entry in the page metadata is superseded by this file.

export const runtime = 'edge';

export const alt = 'Blue Escrow — Decentralized Escrow on Arbitrum';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            'linear-gradient(135deg, #0b1117 0%, #001b4d 60%, #0066ff 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '80px',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 28,
            opacity: 0.6,
            letterSpacing: 2,
            marginBottom: 16,
            textTransform: 'uppercase',
          }}
        >
          Blue Escrow
        </div>
        <div style={{ fontSize: 92, lineHeight: 1.02, fontWeight: 600 }}>
          Your money in a smart contract.{' '}
          <span style={{ fontStyle: 'italic', opacity: 0.85 }}>
            Not in someone&apos;s pocket.
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
