import type { MetadataRoute } from 'next';
import { absoluteUrl, siteConfig } from '@/server/seo';

/** Sitemap. Lists every public, indexable surface. Auth-gated and
 *  noIndex pages stay off (per SEO rule S7/S8). When a new top-level
 *  route lands, append it here in the same commit. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: siteConfig.url,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/about'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/leaderboard'),
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/race'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/drills'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
