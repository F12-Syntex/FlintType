# FT-047 — Changelog renders raw markdown ('**Ready**') on /changelog and in the What's New dialog

> **Severity:** LOW  •  **Area:** `ui`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

CHANGELOG.md line 159 contains '…presses **Ready**, the lobby shows…'. Both renderers print `{line}` as plain text with no inline-markdown handling, so the literal asterisks appear on screen. Confirmed on /changelog via page text: 'Each player presses **Ready**, the lobby shows who's set…'.

## Affected code

- `public/CHANGELOG.md:159 (renderers: src/app/changelog/page.tsx:90-92, src/app/_components/whats-new-dialog.tsx:131-133)`

## Evidence

CHANGELOG.md line 159 contains '…presses **Ready**, the lobby shows…'. Both renderers print `{line}` as plain text with no inline-markdown handling, so the literal asterisks appear on screen. Confirmed on /changelog via page text: 'Each player presses **Ready**, the lobby shows who's set…'.

## Steps to reproduce

Open /changelog and scroll to the ready-up entry (v6.119 area), or trigger the What's New dialog spanning that version.

## Proposed fix

Strip or render inline markdown in parseChangelog/the line renderer, or amend the CHANGELOG.md format note to forbid inline markdown and fix line 159.

## Suggested labels

`severity:low` `area:ui`

---

_Found by: lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._
