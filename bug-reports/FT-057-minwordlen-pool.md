# FT-057 — Minimum word length 7-8 collapses the word pool to 16/4 words — passages repeat the same few words

> **Severity:** LOW  •  **Area:** `behaviour`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The English pool is 200 words; filtering ≥8 chars leaves exactly 4 (interest, possible, consider, increase), ≥7 leaves 16 (verified: node over src/data/english.json and the cached flinttype:wordlist:v1:english both report ge8=4). Browser-confirmed passage with minWordLength=8: 'increase possible consider possible increase consider interest 845 interest increase'.

## Affected code

- `src/app/_components/practice-reducer.ts:126-137`

## Evidence

The English pool is 200 words; filtering ≥8 chars leaves exactly 4 (interest, possible, consider, increase), ≥7 leaves 16 (verified: node over src/data/english.json and the cached flinttype:wordlist:v1:english both report ge8=4). Browser-confirmed passage with minWordLength=8: 'increase possible consider possible increase consider interest 845 interest increase'. The settings UI happily offers 7 and 8 with no hint the pool is nearly empty; the section preview also shows a single word ('together') for ≥8, hinting at the starvation without explaining it.

<!-- evidence-embedded -->

**Captured screenshots:**

![Min word length = 8 behaviour preview](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/behaviour-previews-blind-min8.png)

*Min word length = 8 behaviour preview.*

## Steps to reproduce

Customise → Behaviour → Minimum word length:
8. Open / — the passage cycles the same 4 words.

## Proposed fix

Either cap the chip range to what the pool supports (e.g. ≤6), use a larger embedded list for high thresholds, or show a 'only N words match' caption on the row.

## Suggested labels

`severity:low` `area:behaviour`

---

_Found by: lane:practice+behaviour. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-057-minwordlen-pool.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-057-minwordlen-pool.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
