# FT-023 — Guest PB cache stores the stale 1 Hz live WPM instead of the final WPM

> **Severity:** MEDIUM  •  **Area:** `practice`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

TestSummary's anonymous-PB effect calls `recordIfPb(mode, state.length, wpm)` where `wpm` is the context value fed by the provider's throttled `liveStats` (practice-state.tsx:700-767: updated once per second while running; only snapped to the exact final value by a provider effect at phase 'done', lines 757-761).

## Affected code

- `src/app/_components/test-summary.tsx:472`

## Evidence

TestSummary's anonymous-PB effect calls `recordIfPb(mode, state.length, wpm)` where `wpm` is the context value fed by the provider's throttled `liveStats` (practice-state.tsx:700-767: updated once per second while running; only snapped to the exact final value by a provider effect at phase 'done', lines 757-761). React runs child effects before parent effects, so when phase flips to 'done' the TestSummary effect fires FIRST and reads the last 1-second-old live sample, not the final value. Observed live: a run whose results screen displayed WPM 94 (with the PB crown) left `localStorage['ft:pb:words|10'] = "48"` — the stale mid-run sample. A subsequent words-10 run that displayed WPM 1400 then failed to update the cache (still 48 afterwards) and was not crowned, because recordIfPb compared its own stale sample against 48. Signed-in users are unaffected (server `lastTestIsPb` verdict), but for every signed-out user the stored PB is an arbitrary mid-run sample, producing both false crowns and missed crowns on subsequent runs.

## Steps to reproduce

1. Signed out, clear localStorage at http://localhost:3000/.
2. Complete a 10-word test with uneven pacing (burst, pause, burst).
3. Compare the headline WPM on the results screen with localStorage key `ft:pb:words|10` — the stored value is much lower (e.g. 94 displayed vs 48 stored).
4. Complete a clearly faster run — no PB crown appears and the cache doesn't update.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

Verified by code reading. TestSummary's anonymous PB effect (test-summary.tsx:461-474) reads the context `wpm`, which is the provider's 1 Hz-throttled liveStats (practice-state.tsx:709-767); the snap-to-final happens only in the provider's useEffect (lines 757-761). React runs descendant effects before ancestor effects in the same commit, so on the render where phase flips to 'done' the PB effect fires first with the up-to-1s-stale sample and writes it via recordIfPb (pb-cache.ts:42-47 — the cache's only writer). The effect's deps deliberately exclude `wpm` (eslint-disable at line 473), and for anonymous users lastTestIsPb stays null (run never submitted, practice-state.tsx:139-145), so the effect never re-runs with the corrected value. The headline re-renders with the snapped final value, matching the observed "94 displayed vs 48 stored". The provider comment at lines 705-708 claiming the throttle "never affects recorded" values is violated by this path. No guard, layout-effect, second writer, or test refutes it. However, impact is guest-only (signed-in users use the server lastTestIsPb verdict), affects only the crown badge + a localStorage cache, and displayed stats are correct — so 'high' overstates it; medium is honest.

## Proposed fix

Don't use the throttled context `wpm` in the PB effect — recompute the final value from state (same as the submission path, which the practice-state comment at lines 705-708 says 'recomputes from state directly'), or expose the final computed WPM from the provider and depend on it in the effect.

## Suggested labels

`severity:medium` `area:practice`

---

_Found by: lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._
