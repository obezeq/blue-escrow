import { ClientShell } from '@/features/homepage/ClientShell';
import { HeroSection } from '@/features/homepage/HeroSection/HeroSection';
import { TheProblem } from '@/features/homepage/TheProblem/TheProblem';
import { TheSolution } from '@/features/homepage/TheSolution/TheSolution';
import { HowItWorks } from '@/features/homepage/HowItWorks/HowItWorks';
import { TheFlow } from '@/features/homepage/TheFlow/TheFlow';
import { TrustLayer } from '@/features/homepage/TrustLayer/TrustLayer';
import { FeeSection } from '@/features/homepage/FeeSection/FeeSection';
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
      <HowItWorks />
      <SectionTransition from="blue" to="white" />
      <TheFlow />
      <TrustLayer />
      <SectionTransition from="white" to="blue" />
      <FeeSection />
    </>
  );
}
