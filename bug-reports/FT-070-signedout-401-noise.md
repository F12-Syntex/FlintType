# FT-070 — Signed-out visitors fire guaranteed-401 API calls on every page load / pref change / completed run (console error noise)

> **Severity:** LOW  •  **Area:** `practice`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Observed in the console while signed out: 401 on /api/prefs/get on every page load, 401 on /api/prefs/set on every preference change, and 401s on /api/adapt/submit followed by /api/adapt/words after every completed run. The submit effect (practice-state.tsx:533-640) has no auth gate — it calls adapt.submitTest for anonymous users (always 401, swallowed);

## Affected code

- `C:/Users/synte/Programming/programming2/flinttype/src/app/_components/practice-state.tsx:533-640`

## Evidence

Observed in the console while signed out: 401 on /api/prefs/get on every page load, 401 on /api/prefs/set on every preference change, and 401s on /api/adapt/submit followed by /api/adapt/words after every completed run. The submit effect (practice-state.tsx:533-640) has no auth gate — it calls adapt.submitTest for anonymous users (always 401, swallowed); worse, the post-submit refill at line 584 reads `const adaptOn = state.adapt` (the RAW reducer flag, default true) instead of `effectiveState.adapt` (which is forced false for anonymous users at lines 841-844), so the adapt/words refill fires too even though adapt is disabled for the viewer. Cosmetically this means every anonymous visitor's console accumulates red 401 errors during normal use; functionally it is wasted network and server log noise on the most common (signed-out) path.

<!-- evidence-embedded -->

**Captured screenshots:**

![Race joined while signed out](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/race-joined-signedout.png)

*Race joined while signed out.*

## Steps to reproduce

1) Open http://localhost:3000/ signed out with the console open (401 prefs/get).
2) Complete any test (401 adapt/submit + 401 adapt/words).
3) Change any setting (401 prefs/set).

## Proposed fix

Gate the submit effect on adaptAuthAllowed (skip submitTest when signed out), use effectiveState.adapt for the refill condition, and have use-remote-prefs skip server sync when Clerk reports no user.

## Corroborating reports

Independently surfaced by 4 finder(s); this report merges them.

- **lane:practice+behaviour** — Signed-out clients fire auth-gated endpoints on every page load and every pref change (401 console errors) (`src/lib/use-remote-prefs.ts:30`)
- **lane:pages+race-flow** — Every signed-out page load logs a console 401 error from /api/prefs/get (`src/lib/prefs-store.ts:145-148 (called from src/lib/use-remote-prefs.ts:30)`)
- **lane:pages+race-flow** — Signed-out client fires doomed auth-gated API calls on every page load and run completion — persistent 401 console errors (`src/lib/use-adapt.ts:65,150`)

## Suggested labels

`severity:low` `area:practice`

---

_Found by: lane:pages+race-flow, lane:practice+behaviour. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-070-signedout-401-noise.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-070-signedout-401-noise.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
