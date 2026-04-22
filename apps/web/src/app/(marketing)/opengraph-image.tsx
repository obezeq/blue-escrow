import { ImageResponse } from 'next/og';

// Next's file-based Open Graph resolver for the (marketing) route segment.
// At build/request time Next invokes this default export, bakes the result
// into the og:image meta tag for every page under the segment, and cascades
// the exported `alt`, `size`, and `contentType` into the matching og:image:*
// meta tags (see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image).
//
// Co-located twitter-image.tsx mirrors this file — Next also auto-resolves it
// for twitter:image, so metadata callers do not need to pass twitter.images.
//
// Edge runtime is chosen for the colder start characteristics: no Node-only
// APIs are required here (no font binaries, no filesystem reads), and edge
// rendering keeps the 1200x630 payload close to the visitor.

export const runtime = 'edge';

export const alt = 'Blue Escrow — Decentralized Escrow on Arbitrum';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          // Brand gradient: deep graphite -> navy -> brand blue. Matches the
          // homepage hero background stops so social previews share a visual
          // signature with the landing page.
          background:
            'linear-gradient(135deg, #0b1117 0%, #001b4d 60%, #0066ff 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '80px',
          color: 'white',
          // `next/og` (Satori) falls back to a built-in sans when no custom
          // font is registered; that keeps this resolver dependency-free.
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
