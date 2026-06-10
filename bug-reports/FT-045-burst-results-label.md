# FT-045 — BURST results screen labels the run as 'words N' in TEST TYPE

> **Severity:** LOW  •  **Area:** `practice`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

modeLabel (test-summary.tsx:499-504) handles only TIME and QUOTE and lets every other mode fall through to `words ${state.length}`.

## Affected code

- `src/app/_components/test-summary.tsx:499`

## Evidence

modeLabel (test-summary.tsx:499-504) handles only TIME and QUOTE and lets every other mode fall through to `words ${state.length}`. BURST runs end on the same TestSummary surface (typing-surface.tsx:128-129 renders TestSummary whenever phase is done, including BURST), so a 40-item burst result reads 'TEST TYPE words 40' — mislabelled, and the stats (wpm over the whole stop-start rep session) read as a words-mode score.

## Steps to reproduce

Complete a burst set (e.g. custom items = 1, type the word). Results screen TEST TYPE shows 'words 1'.

## Proposed fix

Add a BURST branch to modeLabel (`burst ${state.length}`), or give BURST its own condensed summary instead of the words-mode TestSummary.

## Suggested labels

`severity:low` `area:practice`

---

_Found by: review:practice-core. Generated from scan run `wf_a630179b-84b`._
