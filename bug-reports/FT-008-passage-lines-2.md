# FT-008 — 'Lines rendered' = 2: caret rides the last visible line, so the upcoming line is never shown (no lookahead)

> **Severity:** MEDIUM  •  **Area:** `practice/passage`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Scroll math: `cap = round(clipHeight/lh); trigger = floor(cap/2); desired = max(0, currentLine - trigger) * lh`. For cap=2, trigger=1, which pins the caret to visual line index 1 — the bottom of the two visible lines — so the line above is history and the upcoming line is clipped. cap=2 is the only degenerate value: cap=1 gives trigger=0 (fine), cap>=3 always leaves >=1 lookahead line below.

## Affected code

- `src/app/_components/passage.tsx:517-521`

## Evidence

Scroll math: `cap = round(clipHeight/lh); trigger = floor(cap/2); desired = max(0, currentLine - trigger) * lh`. For cap=2, trigger=1, which pins the caret to visual line index 1 — the bottom of the two visible lines — so the line above is history and the upcoming line is clipped. cap=2 is the only degenerate value: cap=1 gives trigger=0 (fine), cap>=3 always leaves >=1 lookahead line below. Verified in the browser with linesRendered=2 (screenshot .playwright-mcp/lines2-caret2.png): clip box = 168px = 2×84px lines; after typing past line 0 the caret sits on the bottom visible line with the entire first line already typed and no upcoming text visible. Sibling exposure: the AI design-studio catalog's `lines: compact` option (src/server/routes/appearance/options.ts:159) resolves to exactly linesRendered=2, so the AI can steer users into this state.

<!-- evidence-embedded -->

**Captured screenshots:**

![Caret pinned to the bottom of two visible lines - no lookahead](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/lines2-caret-bottom.png)

*Caret pinned to the bottom of two visible lines - no lookahead.*

![Caret riding the last visible line mid-run](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/bughunt-lines2-caret-last-line.png)

*Caret riding the last visible line mid-run.*

## Steps to reproduce

Customise → Typing area → Lines rendered = 2 → go to / and type past the first line. The caret rides the bottom line; you can never see the next line.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code reading confirms every step of the claim. passage.tsx:427-433 sets clipHeight = min(linesRendered, fits) * lh, so linesRendered=2 yields cap = round(2lh/lh) = 2 at line 517. trigger = floor(2/2) = 1 (line 518), so desired = (currentLine-1)*lh once past line 0 — the caret line sits at relative offset lh, the bottom of the two visible lines; the next line is at 2lh, outside the clip. The line above is already-typed history, so the user has zero lookahead, contradicting the code's own stated intent ('keep the cursor at the mid-line'). cap=1 (trigger=0) and cap>=3 (>=1 lookahead line) are fine; cap=2 is the unique degenerate value. The state is reachable: the customise numeric input accepts 1-20 (passage-rows.tsx:132-144), server sanitize allows 0-6, and the AI design-studio 'lines: compact' option (src/server/routes/appearance/options.ts:159) sets linesRendered=2 directly; it can also occur with larger/All settings on a viewport where only 2 lines fit (fits=2). No clamp, guard, or test anywhere asserts otherwise (components have no automated tests per ui-law §1.3). The suggested fix (trigger = min(floor(cap/2), cap-2) for cap>=2) is correct: cap=2 -> caret on top line with one lookahead; cap=1, 3, 4+ behaviour unchanged. Severity medium is fair: real usability degradation (upcoming text never visible) but only in a non-default configuration with a trivial workaround.

## Proposed fix

Clamp the trigger so at least one lookahead line stays visible: `const trigger = Math.max(0, Math.min(Math.floor(cap / 2), cap - 2))` (cap>=2), keeping cap=1 behaviour unchanged.

## Corroborating reports

Independently surfaced by 6 finder(s); this report merges them.

- **lane:appearance+responsive** — linesRendered=2: scroll formula keeps the caret on the bottom visible line, so the upcoming line is never visible after line 0 (`src/app/_components/passage.tsx:517-520`)
- **review:practice-core** — linesRendered=2: caret settles on the LAST visible line, hiding the upcoming line for the whole run (`src/app/_components/passage.tsx:517`)
- **review:db-social** — [seeded, confirmed] 2 rendered lines: caret types on the LAST visible line — upcoming line is never visible (`src/app/_components/passage.tsx:516-521`)
- **review:stats-progression** — Passage caret rides the LAST visible line when 'Lines rendered' is 2 (no lookahead line) (`src/app/_components/passage.tsx:516-521`)
- **lane:practice+behaviour** — linesRendered=2: caret types on the LAST visible line so the upcoming line is never visible (no lookahead) (`C:/Users/synte/Programming/programming2/flinttype/src/app/_components/passage.tsx:517-521`)

## Suggested labels

`severity:medium` `area:practice`

---

_Found by: lane:appearance+responsive, lane:practice+behaviour, review:customise-prefs, review:db-social, review:practice-core, review:stats-progression. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-008-passage-lines-2.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-008-passage-lines-2.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
