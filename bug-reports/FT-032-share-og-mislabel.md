# FT-032 — Share page and OG image label every TIME/QUOTE run as 'Words - N'

> **Severity:** MEDIUM  •  **Area:** `share`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

`lengthLabel` (and the identical `formatLengthLabel` in src/app/share/[slug]/opengraph-image.tsx:744-748) does `if (mode === "time" || /time/i.test(mode)) return \`Time · ${amount}s\``, but the mode strings persisted by practice-state.tsx:587-591 are only ever "race" | "training" | "casual" — the substring 'time' can never appear, so the branch never fires.

## Affected code

- `src/app/share/[slug]/_components/share-card.tsx:18-22`

## Evidence

`lengthLabel` (and the identical `formatLengthLabel` in src/app/share/[slug]/opengraph-image.tsx:744-748) does `if (mode === "time" || /time/i.test(mode)) return \`Time · ${amount}s\``, but the mode strings persisted by practice-state.tsx:587-591 are only ever "race" | "training" | "casual" — the substring 'time' can never appear, so the branch never fires. A 60-second TIME run shares as 'Words · 60' on the share card AND in the social-preview OG image. Root cause: the tests schema (src/db/schema/server/tests.ts:32) stores only `duration_or_word_count`, with no time-vs-words discriminator.

## Steps to reproduce

Run a TIME 60s test, share it, open /share/<slug> — the eyebrow reads 'Words · 60' and the OG preview image shows 'words · 60'.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Verified end-to-end by code reading. (1) Both label helpers (share-card.tsx:18-22 and opengraph-image.tsx:744-748) branch on /time/i and /quote/i against the mode string before defaulting to 'Words · N'. (2) practice-state.tsx:587-591 submits mode = 'race' | 'training' | 'casual' only, regardless of whether the run was WORDS/TIME/QUOTE; the Zod testModeSchema (src/types/adapt.ts:56-61, enum: casual/training/reverse_adaptive/race) makes a 'time'/'quote' mode string impossible at the wire boundary, and the share route (src/server/routes/share/load.ts:88) passes row.mode through untransformed. Both detection branches are provably dead. (3) The schema's own comment (tests.ts:29-31) confirms durationOrWordCount is seconds in TIME mode and a group index in QUOTE mode, so a 60s TIME run renders 'Words · 60' and a quote run 'Words · 2' on both the share page and the OG image. (4) The share button (test-summary.tsx:653) appears for any submitted run including TIME/QUOTE (only BURST skips submission), so real users hit this on every shared time/quote run. No guard, transformation, or test asserts the opposite — the one share test fixture uses mode 'training' with wordcount semantics, which never exercises the bug. Severity medium is fair: purely cosmetic but a factually wrong label on the product's public shareable artifact and its social preview.

## Proposed fix

Persist the length mode (e.g. a `lengthMode: 'time'|'words'|'quote'` column or fold it into the mode string) and branch the label on it; until then at minimum drop the misleading 'Words ·' prefix when the unit is unknown.

## Suggested labels

`severity:medium` `area:share`

---

_Found by: review:ui-misc. Generated from scan run `wf_a630179b-84b`._
