import dynamic from 'next/dynamic';
import { HeroSection } from '@/features/homepage/HeroSection/HeroSection';
import { SectionTransition } from '@/components/ui';

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

export default function HomePage() {
  return (
    <>
      <Preloader />
      <CinematicIntro />
      <HeroSection />
      <SectionTransition from="blue" to="white" />
    </>
  );
}
