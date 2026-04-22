// FAQPage schema.org builder. The FAQ answers are authored as JSX so they can
// render <strong> emphasis on the page — but Google needs plain text in the
// `acceptedAnswer.text` field, so we walk the React tree and flatten it.
// Keep this in `.ts` (no JSX) since we only CONSUME ReactNode here.
//
// schema.org/FAQPage: https://schema.org/FAQPage
import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { FAQ_ITEMS } from './questions';

/**
 * Flattens a ReactNode into plain text. Handles strings, numbers, arrays,
 * fragments, and elements with children — everything we author in the FAQ.
 * Defensively skips booleans / null / undefined the same way React does.
 */
export function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join('');
  }
  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>;
    return textOf(element.props.children);
  }
  return '';
}

interface FaqJsonLd {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

export function buildFaqJsonLd(): FaqJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: textOf(item.answer).replace(/\s+/g, ' ').trim(),
      },
    })),
  };
}
