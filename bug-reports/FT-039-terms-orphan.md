# FT-039 — /terms is an orphan page — in the sitemap but linked from nowhere in the UI

> **Severity:** LOW  •  **Area:** `ui`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Repo-wide grep for '/terms' finds only the page's own canonical path and the sitemap entry — no <Link>/<a> anywhere points to it. The app footer links Privacy but not Terms; the privacy page does not cross-link it either. The page itself renders fine when visited directly.

## Affected code

- `src/app/terms/page.tsx (sitemap entry: src/app/sitemap.ts:65)`

## Evidence

Repo-wide grep for '/terms' finds only the page's own canonical path and the sitemap entry — no <Link>/<a> anywhere points to it. The app footer links Privacy but not Terms; the privacy page does not cross-link it either. The page itself renders fine when visited directly.

## Steps to reproduce

grep -r '"/terms' src — only src/app/terms/page.tsx:9 and the sitemap match; click through every footer/nav link in the app and you can never reach /terms.

## Proposed fix

Add a Terms link beside Privacy in the AppFooter (and/or cross-link from /privacy).

## Suggested labels

`severity:low` `area:ui`

---

_Found by: lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._
