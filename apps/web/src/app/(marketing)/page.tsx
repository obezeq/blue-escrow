import { ClientShell } from '@/features/homepage/ClientShell';
import { HeroSection } from '@/features/homepage/HeroSection/HeroSection';
import { TheProblem } from '@/features/homepage/TheProblem/TheProblem';
import { TheSolution } from '@/features/homepage/TheSolution/TheSolution';
import { SectionTransition } from '@/components/ui';

export default function HomePage() {
  return (
    <>
      <ClientShell />
      <HeroSection />
      <SectionTransition from="blue" to="white" />
      <TheProblem />
      <TheSolution />
      <SectionTransition from="white" to="blue" />
    </>
  );
}
