'use client';

import dynamic from 'next/dynamic';

const CustomCursor = dynamic(
  () =>
    import('@/components/ui/CustomCursor/CustomCursor').then(
      (m) => m.CustomCursor,
    ),
  { ssr: false },
);

const GrainOverlay = dynamic(
  () =>
    import('@/components/ui/GrainOverlay/GrainOverlay').then(
      (m) => m.GrainOverlay,
    ),
  { ssr: false },
);

/**
 * Browser-only enhancements (custom cursor + film grain).
 * The Three.js hero scene is mounted inside HeroSection now, not at the
 * layout level, so there's no persistent full-viewport canvas anymore.
 * next/dynamic with ssr:false lives here because Server Components
 * cannot use it directly (Next.js 16+).
 */
export function ClientEnhancements() {
  return (
    <>
      <CustomCursor />
      <GrainOverlay />
    </>
  );
}
