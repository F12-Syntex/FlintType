# FT-046 — BURST: picking a new wordlist at rest does not re-roll the passage and Tab cannot apply it

> **Severity:** LOW  •  **Area:** `practice`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The wordlist-resolve re-roll effect bails for BURST: `if (state.mode !== "WORDS" && state.mode !== "TIME") return;` (practice-state.tsx:267), yet the mode bar explicitly offers the wordlist picker in BURST (mode-bar.tsx:187-190, "BURST also draws from the wordlist, so it gets the picker too"). After picking a new wordlist in BURST at rest, the visible item list does not change;

## Affected code

- `src/app/_components/practice-state.tsx:267`

## Evidence

The wordlist-resolve re-roll effect bails for BURST: `if (state.mode !== "WORDS" && state.mode !== "TIME") return;` (practice-state.tsx:267), yet the mode bar explicitly offers the wordlist picker in BURST (mode-bar.tsx:187-190, "BURST also draws from the wordlist, so it gets the picker too"). After picking a new wordlist in BURST at rest, the visible item list does not change; Tab in BURST is BURST_RESET (retry current word, practice-state.tsx:1097-1101), not restart, so the standard 'press Tab' habit doesn't apply it either — only Esc (restart) or finishing the set picks up the new pool via buildCfg().

## Steps to reproduce

Burst mode > wordlist chip > pick a different list. The items shown don't change; press Tab — still unchanged. Only Esc re-rolls from the new list.

## Proposed fix

Include BURST in the wordlist-resolve re-roll effect's allowed modes (it already guards on phase === "rest", so a mid-run swap is still deferred).

## Suggested labels

`severity:low` `area:practice`

---

_Found by: review:practice-core. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-046-burst-wordlist-reroll.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-046-burst-wordlist-reroll.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
