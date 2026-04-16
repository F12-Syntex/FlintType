import { describe, expect, it } from 'vitest';
import { absoluteUrl, buildPageMetadata, siteConfig } from './seo';

describe('absoluteUrl', () => {
  it('prefixes the site URL to a relative path', () => {
    expect(absoluteUrl('/about')).toBe(`${siteConfig.url}/about`);
  });

  it('normalizes missing leading slash', () => {
    expect(absoluteUrl('about')).toBe(`${siteConfig.url}/about`);
  });

  it('does not double-slash when site URL has a trailing slash', () => {
    // siteConfig.url is read at module load; we exercise the rule via the helper
    expect(absoluteUrl('/x').startsWith(siteConfig.url.replace(/\/$/, ''))).toBe(true);
    expect(absoluteUrl('/x').includes('//x')).toBe(false);
  });
});

describe('buildPageMetadata', () => {
  it('uses the provided title and defaults to siteConfig.description', () => {
    const m = buildPageMetadata({ title: 'About' });
    expect(m.title).toBe('About');
    expect(m.description).toBe(siteConfig.description);
  });

  it('uses a custom description when provided', () => {
    const m = buildPageMetadata({ title: 'About', description: 'Custom' });
    expect(m.description).toBe('Custom');
  });

  it('sets canonical URL from path', () => {
    const m = buildPageMetadata({ title: 'About', path: '/about' });
    expect(m.alternates?.canonical).toBe(`${siteConfig.url}/about`);
  });

  it('defaults to indexable (robots: index/follow)', () => {
    const m = buildPageMetadata({ title: 'X' });
    expect(m.robots).toEqual({ index: true, follow: true });
  });

  it('flips robots to noIndex when requested', () => {
    const m = buildPageMetadata({ title: 'X', noIndex: true });
    expect(m.robots).toEqual({ index: false, follow: false });
  });

  it('attaches an OG image and uses large Twitter card when image is provided', () => {
    const m = buildPageMetadata({
      title: 'X',
      image: 'https://example.com/og.png',
    });
    expect(m.openGraph?.images).toBeDefined();
    const twitter = m.twitter as { card?: string } | undefined;
    expect(twitter?.card).toBe('summary_large_image');
  });

  it('omits image fields when no image is provided', () => {
    const m = buildPageMetadata({ title: 'X' });
    expect(m.openGraph?.images).toBeUndefined();
    const twitter = m.twitter as { card?: string } | undefined;
    expect(twitter?.card).toBe('summary');
  });
});
