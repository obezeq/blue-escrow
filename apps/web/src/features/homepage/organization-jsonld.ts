// Organization schema.org builder. Emitted inline on the homepage so search
// engines + social previews can identify the publisher (name, logo, links).
// Description mirrors the root layout metadata so we stay single-source.
//
// schema.org/Organization: https://schema.org/Organization
import { getSiteUrl } from '@blue-escrow/config';

const ORG_NAME = 'Blue Escrow';
const ORG_DESCRIPTION =
  'A decentralized escrow protocol where funds are protected by the blockchain, not promises.';
const ORG_FOUNDING_DATE = '2026';

interface OrganizationJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs: string[];
  foundingDate: string;
}

export function buildOrganizationJsonLd(): OrganizationJsonLd {
  const base = getSiteUrl().toString().replace(/\/$/, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG_NAME,
    url: `${base}/`,
    logo: `${base}/logo.svg`,
    description: ORG_DESCRIPTION,
    sameAs: ['https://github.com/obezeq/blue-escrow'],
    foundingDate: ORG_FOUNDING_DATE,
  };
}
