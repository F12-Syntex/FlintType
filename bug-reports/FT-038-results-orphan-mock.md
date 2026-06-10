# FT-038 — /results is an orphaned hardcoded design-mockup route presenting fabricated run data

> **Severity:** LOW  •  **Area:** `results`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The route renders entirely static design-mock content: 'RUN REPORT · #1042 · 14:22 TODAY', WPM 92, fake diagnosis rows ('STALL · "th" transition'), fabricated word errors ('typed "speeed"'), a fake adaptive drill plan, and dead EXPORT / SHARE / 'DRILL THE STALLS →' buttons (big-stats.tsx and siblings under src/app/results/_components/ contain only literal values).

## Affected code

- `src/app/results/page.tsx`

## Evidence

The route renders entirely static design-mock content: 'RUN REPORT · #1042 · 14:22 TODAY', WPM 92, fake diagnosis rows ('STALL · "th" transition'), fabricated word errors ('typed "speeed"'), a fake adaptive drill plan, and dead EXPORT / SHARE / 'DRILL THE STALLS →' buttons (big-stats.tsx and siblings under src/app/results/_components/ contain only literal values). It claims '14:22 TODAY' regardless of reality and shows the same numbers to every visitor — a user landing here believes it's their own run report. It is noIndex and not linked from any nav (only reference in src is its own page.tsx), but it's a guessable top-level URL on a typing-test site. The 'DRILL THE STALLS →' / 'RUN →' labels also violate ui-law §17.5's no-arrow-glyphs-in-affordances rule, consistent with this being an unintegrated prototype left in the route tree.

## Steps to reproduce

Navigate to http://localhost:3000/results signed out (or signed in) — the identical fake report renders.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code reading fully confirms the claim: src/app/results/page.tsx composes ten purely static _components with no data fetching or auth gate; header.tsx hardcodes 'RUN REPORT · #1042 · 14:22 TODAY', '92 wpm', '+6 over your 30-day average', and renders EXPORT/SHARE/'DRILL THE STALLS →' FtButtons with no onClick handlers (dead, and the arrow glyph violates ui-law §17.5); big-stats.tsx and siblings are all string literals. Git history (commit 0f2a44b 'port run report screen with diagnosis dashboard', describing literal values and 'deterministic data') shows this was a ported design mock never wired to real data — the real results surface is src/app/_components/test-summary.tsx on the practice flow. No guard or test refutes it. However, severity is overstated: the route is noIndex, absent from sitemap.ts and llms.txt, and referenced nowhere in src except its own metadata (the monkeytype-import '/results' hit is MonkeyType's external API). No user flow reaches it; it requires manually guessing the URL, and the harm is momentary confusion, not data loss or broken functionality. Downgraded to low — a cleanup item (delete or wire the prototype route), not a user-facing product bug.

## Proposed fix

Remove the prototype route (or move it under a clearly-labelled /design-lab path), or wire it to real run data before exposing it.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **lane:pages+race-flow** — /results is an orphaned static design-mockup route (hardcoded stats, dead buttons), reachable only by direct URL (`src/app/results/_components/header.tsx:10-28 (page: src/app/results/page.tsx)`)

## Suggested labels

`severity:low` `area:results`

---

_Found by: lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-038-results-orphan-mock.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-038-results-orphan-mock.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
