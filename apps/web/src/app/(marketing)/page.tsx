import type { Metadata } from 'next';
import { ClientShell } from '@/features/homepage/ClientShell';
import { HeroSection } from '@/features/homepage/HeroSection/HeroSection';
import { TheProblem } from '@/features/homepage/TheProblem/TheProblem';
import { TheSolution } from '@/features/homepage/TheSolution/TheSolution';
import { HowItWorks } from '@/features/homepage/HowItWorks/HowItWorks';
import { TheFlow } from '@/features/homepage/TheFlow/TheFlow';
import { TrustLayer } from '@/features/homepage/TrustLayer/TrustLayer';
import { FeeSection } from '@/features/homepage/FeeSection/FeeSection';
import { CtaSection } from '@/features/homepage/CtaSection/CtaSection';
import { SectionTransition } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Blue Escrow — Decentralized Escrow on Arbitrum',
  description:
    "Your money in a smart contract. Not in someone's pocket. On-chain reputation. 0.33% flat fee.",
  openGraph: {
    title: 'Blue Escrow — Decentralized Escrow on Arbitrum',
    description:
      "Your money in a smart contract. Not in someone's pocket. On-chain reputation. 0.33% flat fee.",
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blue Escrow — Decentralized Escrow on Arbitrum',
    description:
      "Your money in a smart contract. Not in someone's pocket. On-chain reputation. 0.33% flat fee.",
  },
};

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
      <CtaSection />
      <SectionTransition from="blue" to="white" />
    </>
  );
}
