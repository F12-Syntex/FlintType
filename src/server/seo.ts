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
      card: input.image ? 'summary_large_image' : 'summary',
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
