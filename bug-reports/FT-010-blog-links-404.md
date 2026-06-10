# FT-010 — All three blog-index post links 404 — 'Coming soon' posts rendered as live links

> **Severity:** MEDIUM  •  **Area:** `ui`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

POSTS entries (why-adaptive-drills-work, net-wpm-vs-raw-wpm, building-the-race-engine) all have publishedAt: 'Coming soon' but each title renders as `<Link href={'/blog/' + p.slug}>`. No /blog/<slug>/page.tsx exists for any of them. Observed: clicking 'Why adaptive drills work' navigates to /blog/why-adaptive-drills-work which renders the 404 page ('404 — passage not found').

## Affected code

- `src/app/blog/page.tsx:56-67`

## Evidence

POSTS entries (why-adaptive-drills-work, net-wpm-vs-raw-wpm, building-the-race-engine) all have publishedAt: 'Coming soon' but each title renders as `<Link href={'/blog/' + p.slug}>`. No /blog/<slug>/page.tsx exists for any of them. Observed: clicking 'Why adaptive drills work' navigates to /blog/why-adaptive-drills-work which renders the 404 page ('404 — passage not found'). /blog is a public, indexed page (in sitemap), so these are crawlable dead links.

## Steps to reproduce

Visit /blog, click any post title.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Confirmed by direct code reading and live check. src/app/blog/page.tsx lines 56-67 unconditionally wrap every POSTS title in <Link href={`/blog/${p.slug}`}> while all three entries are marked publishedAt: 'Coming soon'. Glob of src/app/blog/** shows page.tsx is the only file — no [slug] route or per-post page exists, and the file's own header comment confirms the intended contract (create /blog/<slug>/page.tsx per entry) was never fulfilled. curl http://localhost:3000/blog/why-adaptive-drills-work returns 404. sitemap.ts:41 includes /blog, so the index is public and crawlable, making the three dead links reachable by users and crawlers. No guard, fallback route, or test contradicts the finding. Severity medium is honest: clicking a post title is the primary action on a blog index and reliably dead-ends, plus minor SEO harm; the adjacent 'Coming soon' label only partially mitigates since the title is styled as a live link.

## Proposed fix

Render unpublished posts as plain text (no Link) until the post page ships, or hide them from the index.

## Suggested labels

`severity:medium` `area:ui`

---

_Found by: lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._
