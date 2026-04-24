'use client';

import dynamic from 'next/dynamic';

const Preloader = dynamic(
  () => import('@/features/homepage/Preloader').then((m) => m.Preloader),
  { ssr: false },
);

export function ClientShell() {
  return <Preloader />;
}
