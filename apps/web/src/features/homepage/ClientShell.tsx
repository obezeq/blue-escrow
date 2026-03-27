'use client';

import dynamic from 'next/dynamic';

const Preloader = dynamic(
  () =>
    import('@/features/homepage/Preloader/Preloader').then(
      (m) => m.Preloader,
    ),
  { ssr: false },
);

const CinematicIntro = dynamic(
  () =>
    import('@/features/homepage/CinematicIntro/CinematicIntro').then(
      (m) => m.CinematicIntro,
    ),
  { ssr: false },
);

export function ClientShell() {
  return (
    <>
      <Preloader />
      <CinematicIntro />
    </>
  );
}
