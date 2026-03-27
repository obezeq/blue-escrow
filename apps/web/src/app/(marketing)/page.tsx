import { ClientShell } from '@/features/homepage/ClientShell';
import { HeroSection } from '@/features/homepage/HeroSection/HeroSection';
import { SectionTransition } from '@/components/ui';

export default function HomePage() {
  return (
    <>
      <ClientShell />
      <HeroSection />
      <SectionTransition from="blue" to="white" />
    </>
  );
}
