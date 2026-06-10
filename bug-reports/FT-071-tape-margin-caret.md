# FT-071 — Tape margin slider allows values that pin the caret in the right fade band (next char invisible / unplayable)

> **Severity:** LOW  •  **Area:** `practice`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

tapeFadeMask clamps only the LEFT fade to the caret margin (`const left = Math.min(margin, edge)`); the right side is fixed at `#000 ${100 - edge}%, transparent 100%`. The Customise slider allows tapeMargin 0-100 (tape-row.tsx:130-137).

## Affected code

- `src/lib/tape-fade.ts:18`

## Evidence

tapeFadeMask clamps only the LEFT fade to the caret margin (`const left = Math.min(margin, edge)`); the right side is fixed at `#000 ${100 - edge}%, transparent 100%`. The Customise slider allows tapeMargin 0-100 (tape-row.tsx:130-137). With strong fade (edge=20) and tapeMargin > 80 — or soft (edge=9) and margin > 91 — the caret anchor sits inside the right transparency ramp, so the caret and the active/upcoming text render semi-transparent permanently (fully invisible at margin 100). This violates the function's own contract ("the caret + upcoming text stay crisp"); tape-fade.test.ts:22-29 covers the left clamp only.

## Steps to reproduce

Customise > Typing area > tape mode on, tape fade strong, caret position slider to 90-100%. Start typing: the caret and the text at the anchor are faded/invisible.

## Proposed fix

Clamp the right band start to stay right of the caret: `const right = Math.max(100 - edge, Math.min(100, margin + buffer))` (e.g. buffer ~5), mirroring the left-side clamp.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **lane:appearance+responsive** — Tape margin slider allows 100%, which pins the caret to the right edge so the next character is never visible (test unplayable) (`src/app/customise/appearance/_components/tape-row.tsx:130-137`)

## Suggested labels

`severity:low` `area:practice`

---

_Found by: lane:appearance+responsive, review:practice-core. Generated from scan run `wf_a630179b-84b`._
