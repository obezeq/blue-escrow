'use client';

import dynamic from 'next/dynamic';

const SceneCanvas = dynamic(() => import('@/three/canvas/SceneCanvas'), {
  ssr: false,
});

const CustomCursor = dynamic(
  () =>
    import('@/components/ui/CustomCursor/CustomCursor').then(
      (m) => m.CustomCursor,
    ),
  { ssr: false },
);

/**
 * Browser-only enhancements (Three.js canvas, custom cursor).
 * Extracted to a client component because next/dynamic with ssr:false
 * is not allowed in Server Components (Next.js 16+).
 */
export function ClientEnhancements() {
  return (
    <>
      <SceneCanvas />
      <CustomCursor />
    </>
  );
}
