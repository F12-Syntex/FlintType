import type { Metadata } from 'next';
import { env } from './env';

export const siteConfig = {
  name: 'flinttype',
  description:
    'Free open-source typing speed test and WPM trainer. Measure your typing speed, fix your weakest letter pairs with adaptive drills, and race friends or bots online.',
  url: env.SITE_URL,
  locale: 'en_US',
} as const;

export type PageMetaInput = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  image?: string;
};

export function buildPageMetadata(input: PageMetaInput): Metadata {
  const description = input.description ?? siteConfig.description;
  const url = input.path ? absoluteUrl(input.path) : siteConfig.url;
  const robots = input.noIndex
    ? { index: false, follow: false }
    : { index: true, follow: true };

  return {
    title: input.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title: input.title,
      description,
      ...(input.image ? { images: [{ url: input.image }] } : {}),
    },
    twitter: {
      // The file-based opengraph-image / twitter-image (src/app/*) auto-
      // injects a 1500x787 brand card into every page, so summary_large_image
      // is the correct card kind even when no per-page image is provided —
      // it makes the auto-injected image fill the preview at full width
      // instead of being squashed into the small-summary thumbnail.
      card: 'summary_large_image',
      title: input.title,
      description,
      ...(input.image ? { images: [input.image] } : {}),
    },
    robots,
  };
}

export function absoluteUrl(path: string): string {
  const base = siteConfig.url.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
