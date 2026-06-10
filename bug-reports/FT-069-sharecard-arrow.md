# FT-069 — Share card CTA label uses a trailing arrow glyph ('Take the test ->') banned by the project's UI law

> **Severity:** LOW  •  **Area:** `share`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

ui-law.md §17.5 is explicit: 'No directional arrow glyphs in affordance labels. Don't append → ... to buttons, links, or row affordances.' The share page's primary CTA renders `Take the test →` inside an FtButton-styled Link.

## Affected code

- `src/app/share/[slug]/_components/share-card.tsx:127`

## Evidence

ui-law.md §17.5 is explicit: 'No directional arrow glyphs in affordance labels. Don't append → ... to buttons, links, or row affordances.' The share page's primary CTA renders `Take the test →` inside an FtButton-styled Link.

## Steps to reproduce

Open any /share/<slug> page — the ember CTA reads 'Take the test →'.

## Proposed fix

Drop the arrow: 'Take the test'.

## Suggested labels

`severity:low` `area:share`

---

_Found by: review:ui-misc. Generated from scan run `wf_a630179b-84b`._
