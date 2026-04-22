import type { Metadata } from 'next';
import { ClientShell } from '@/features/homepage/ClientShell';
import { HeroSection } from '@/features/homepage/HeroSection/HeroSection';
import { TheProblem } from '@/features/homepage/TheProblem/TheProblem';
import { HowItWorks } from '@/features/homepage/HowItWorks/HowItWorks';
import { TrustLayer } from '@/features/homepage/TrustLayer/TrustLayer';
import { FeeSection } from '@/features/homepage/FeeSection/FeeSection';
import { CtaSection } from '@/features/homepage/CtaSection/CtaSection';
import { Faq } from '@/features/homepage/Faq';
import { Compare } from '@/features/homepage/Compare';
import { Receipts } from '@/features/homepage/Receipts';
import { buildFaqJsonLd } from '@/features/homepage/Faq/faq-jsonld';
import { buildOrganizationJsonLd } from '@/features/homepage/organization-jsonld';

// Escape `<` so a malicious string inside the payload can't terminate the
// <script> element via `</script>`. This matches the recommendation in
// https://nextjs.org/docs/app/guides/json-ld#security.
const toLdJson = (payload: unknown): string =>
  JSON.stringify(payload).replace(/</g, '\\u003c');

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
  // Build payloads at render time — getSiteUrl() reads NEXT_PUBLIC_SITE_URL
  // at request/build time, so these inherit the canonical host automatically.
  const faqJsonLd = buildFaqJsonLd();
  const organizationJsonLd = buildOrganizationJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        data-ld="faq"
        // Payload is escaped by toLdJson() per https://nextjs.org/docs/app/guides/json-ld#security.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: toLdJson(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        data-ld="organization"
        // Payload is escaped by toLdJson() per https://nextjs.org/docs/app/guides/json-ld#security.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: toLdJson(organizationJsonLd) }}
      />
      <ClientShell />
      <HeroSection />
      <TheProblem />
      <HowItWorks />
      <Compare />
      <FeeSection />
      <TrustLayer />
      <Receipts />
      <Faq />
      <CtaSection />
    </>
  );
}
