# FT-027 — MonkeyType import in quote mode writes an invalid quote length, leaving QUOTE with no selectable length

> **Severity:** MEDIUM  •  **Area:** `customise/import-export`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

mapPractice: for mt.mode === 'quote' the length falls through to `typeof mt.words === 'number' → out.length = mt.words` (MT stores quote sizes in `quoteLength`, not `words`), so the practice slice becomes e.g. {mode:'QUOTE', length:50}. flinttype quote lengths are QuoteGroup 0|1|2|3 (src/lib/quotes.ts:10).

## Affected code

- `src/lib/import-export.ts:533-547`

## Evidence

mapPractice: for mt.mode === 'quote' the length falls through to `typeof mt.words === 'number' → out.length = mt.words` (MT stores quote sizes in `quoteLength`, not `words`), so the practice slice becomes e.g. {mode:'QUOTE', length:50}. flinttype quote lengths are QuoteGroup 0|1|2|3 (src/lib/quotes.ts:10). Consequences verified by writing that exact slice and loading '/': the mode bar shows QUOTE with the short/medium/long/thicc selector and NO active length chip (mode-bar.tsx:521 `QUOTE_GROUPS[state.length]?.label ?? ""` yields ''), and on restart loadAndDispatchQuote(50) hits `QUOTE_GROUPS[50]!` → TypeError inside pickQuote (quotes.ts:55), caught and replaced by a generated passage attributed '(quote unavailable)' — so quotes never actually load until the user manually re-picks a length. Bonus: writeSlice('practice', practice) (import-export.ts:275) replaces the whole slice, silently dropping the user's stored adapt=false / custom wordlist back to defaults.

<!-- evidence-embedded -->

**Captured screenshots:**

![Short quote rendering](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/bughunt-quote-short.png)

*Short quote rendering.*

## Steps to reproduce

Import a MonkeyType settings.json with {"mode":"quote","words":50}. Practice lands in QUOTE mode with no length selected; restarting shows '(quote unavailable)' passages.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Every link in the finder's chain holds against the code, and no guard exists anywhere downstream.

1. The mapping bug is exactly as cited. src/lib/import-export.ts:533-547 `mapPractice`: for mt.mode === 'quote', out.mode = 'QUOTE', then the length branch is `if (out.mode === 'TIME' && typeof mt.time === 'number') ... else if (typeof mt.words === 'number') out.length = mt.words`. There is no quote branch and `mt.quoteLength` is never read. MonkeyType's settings.json is a full config dump that always carries a numeric `words` field (default 25/50) regardless of active mode, so a quote-mode MT export yields `{mode:'QUOTE', length:<word count>}`.

2. No sanitizer exists downstream. `writeSlice('practice', practice)` (import-export.ts:275) writes the raw object; `readSlice` (prefs-store.ts:186-193) only spreads `{...defaults, ...slice}` with zero value validation; the slice-to-state mirror effect in practice-state.tsx (lines 353-374) dispatches SET_MODE with `practiceSlice.length` verbatim. Nothing clamps length to QuoteGroup 0-3.

3. The runtime consequence is exactly as claimed. `generateForMode('QUOTE', ...)` returns [] (practice-reducer.ts:216-217), so the cold-start effect (practice-state.tsx:970-981) fires restart(), which calls `loadAndDispatchQuote(state.length as QuoteGroup)` with 50. `pickQuote` (quotes.ts:54-55) does `QUOTE_GROUPS[50]!` then reads `g.min` — a TypeError, caught by the try/catch in loadAndDispatchQuote (practice-state.tsx:792-800), which substitutes a generated passage attributed '(quote unavailable)'. Every restart repeats this; real quotes never load until the user manually re-picks a length (setLength writes a valid 0-3).

4. The mode-bar observation is credible: mode-bar.tsx:521 `QUOTE_GROUPS[state.length as 0|1|2|3]?.label ?? ""` yields an empty summary, and a chip group comparing ids 0-3 against 50 highlights nothing.

5. The bonus claim also holds: unlike the caret/behaviour/appearance/background slices which are written as `{...DEFAULTS, ...mapped}`, the practice slice is written as just `{mode, length}` — replacing the stored slice, so a prior adapt=false or custom wordlist is lost to defaults (adapt:true, wordlist:'english') on the next readSlice merge.

6. No test asserts the contrary — import-export.test.ts only covers the WORDS-mode mapping (length 10).

Severity medium is honest: it requires importing a MonkeyType settings.json whose mode was 'quote' (a realistic migration path the feature explicitly exists for), the resulting state is confusing (no selected length chip, '(quote unavailable)' passages) but recoverable in one click, and typing still works via the fallback. Title is accurate as written.

Key files: C:\Users\synte\Programming\programming2\flinttype\src\lib\import-export.ts (mapPractice 533-547, apply 274-277), C:\Users\synte\Programming\programming2\flinttype\src\lib\quotes.ts (pickQuote 54-61), C:\Users\synte\Programming\programming2\flinttype\src\app\_components\practice-state.tsx (slice mirror 353-377, loadAndDispatchQuote 783-801, cold-start kick 970-981), C:\Users\synte\Programming\programming2\flinttype\src\lib\prefs-store.ts (readSlice 186-193).

## Proposed fix

For quote mode, map MT's quoteLength array (0-3 ids match flinttype's groups; pick the first/lowest) and clamp to 0-3; ignore mt.words. Merge the practice slice instead of replacing it (spread the existing slice or only write the mapped keys).

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **lane:appearance+responsive** — MonkeyType import of a quote-mode settings file writes mt.words as the quote length, making QUOTE mode fall back to '(quote unavailable)' un (`src/lib/import-export.ts:533-547 (mapPractice), src/lib/quotes.ts:54-61, src/app/_components/practice-state.tsx:872`)

## Suggested labels

`severity:medium` `area:customise`

---

_Found by: lane:appearance+responsive, review:customise-prefs. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-027-mt-import-quote-length.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-027-mt-import-quote-length.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
