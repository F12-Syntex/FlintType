# SEO rules

Authoritative guide for search engine and LLM-crawler optimization. Every page ships with correct metadata; every content change considers SEO. Referenced from `CLAUDE.md`.

## What's wired up automatically

| File                                | Serves                     | Purpose                                                          |
|-------------------------------------|----------------------------|------------------------------------------------------------------|
| `src/app/layout.tsx`                | every page (root metadata) | Site name template, description, OpenGraph, Twitter, robots     |
| `src/lib/seo.ts`                    | —                          | `siteConfig` + `buildPageMetadata()` helper + `absoluteUrl()`    |
| `src/app/robots.ts`                 | `/robots.txt`              | Allows everything except `/api/` and `/_next/`, points at sitemap |
| `src/app/sitemap.ts`                | `/sitemap.xml`             | Seeded with `/`; extend when you add top-level routes            |
| `public/llms.txt`                   | `/llms.txt`                | Structured guide for AI crawlers (llmstxt.org spec)             |

## Per-page metadata

Every page under `src/app/**/page.tsx` exports `metadata` or `generateMetadata`:

### Static pages
```ts
// src/app/about/page.tsx
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'About',
  description: 'Who we are and why the product exists.',
  path: '/about',
});
```

### Dynamic pages
Use `generateMetadata` so title and description reflect the actual entity:

```ts
// src/app/posts/[slug]/page.tsx
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  return buildPageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/posts/${slug}`,
    image: post.ogImage,
  });
}
```

## The 9 rules

### S1. Every page exports `metadata` or `generateMetadata`
No relying on the root layout default alone for public pages. The root covers the site shell; each page declares its own title and canonical.

### S2. Titles are descriptive and unique per page
The `layout.tsx` template appends `| ${siteConfig.name}` automatically. Write only the page-specific part (`'About'`, not `'About | Site Name'`).

### S3. Descriptions are 120–160 characters
Under 120 is thin; over 160 gets truncated in search results. Measure before shipping.

### S4. Canonical URL on every page
Pass `path` to `buildPageMetadata({ path })` — never leave canonical implicit. This prevents duplicate-content issues.

### S5. Images have `alt` text
Every `<img>` and `<Image>` from `next/image` ships with `alt="..."`. Decorative images use `alt=""` (empty string — tells screen readers to skip). Never omit the attribute.

### S6. Semantic HTML is non-negotiable
- **One** `<h1>` per page (usually the page title).
- Structural tags: `<main>`, `<article>`, `<section>`, `<nav>`, `<header>`, `<footer>`.
- Lists are `<ul>`/`<ol>`, not `<div>`s.
- Headings nest in order (`h1` → `h2` → `h3`), no jumps.

### S7. Keep `public/llms.txt` in sync
When you add a new top-level route or documentation file, append an entry to `public/llms.txt` **in the same commit**. The format follows [llmstxt.org](https://llmstxt.org): `# Title`, blockquote description, then sectioned link lists.

### S8. Private / admin pages use `noIndex: true`
```ts
export const metadata = buildPageMetadata({
  title: 'Settings',
  path: '/settings',
  noIndex: true,
});
```
Admin panels, logged-in-only views, internal dashboards — none should be indexed.

### S9. `SITE_URL` must be set in production
Defaults to `http://localhost:3000` for dev. Every production deploy sets `SITE_URL` (or `NEXT_PUBLIC_SITE_URL` if you need client access) to the real host, or every canonical URL will point at localhost and SEO ranking collapses.

## Adding a new top-level route

Any new top-level route (not a nested child page) triggers three updates, all in the same commit:

1. `src/app/<route>/page.tsx` — exports `metadata` (S1) with canonical `path` (S4).
2. `src/app/sitemap.ts` — append the new URL entry so crawlers find it.
3. `public/llms.txt` — add a line under `## Pages` linking to the route with a one-line description.

## Performance (free via Next.js)

These are handled by the framework; don't override without reason:
- `next/font/google` optimization (already in `layout.tsx`).
- `next/image` lazy loading and responsive `srcset`.
- Route-level code splitting.
- Automatic gzip / brotli via Vercel (or your hosting).

Do not add third-party font links, `<link rel="stylesheet">` in body, or large unoptimized images.

## LLM checklist before shipping any page change

- [ ] Does the page export `metadata` or `generateMetadata` (S1)?
- [ ] Is the title descriptive and unique (S2)?
- [ ] Is the description 120–160 chars (S3)?
- [ ] Is `path` passed for a canonical URL (S4)?
- [ ] Do all images have `alt` attributes (S5)?
- [ ] Does the page have exactly one `<h1>` and semantic structure (S6)?
- [ ] For new top-level routes: is `public/llms.txt` and `src/app/sitemap.ts` updated in the same commit (S7)?
- [ ] If private/admin: is `noIndex: true` set (S8)?
