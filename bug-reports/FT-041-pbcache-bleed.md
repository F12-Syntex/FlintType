# FT-041 — Anonymous PB-crown cache (and BURST avg cache) bleeds across users on a shared browser; 'resets each session' comment is false

> **Severity:** LOW  •  **Area:** `stats`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

pb-cache keys are `ft:pb:<mode>|<amount>` in localStorage with no userId namespace and no clear on sign-out; the header comment claims it is 'Reset on logout / clear-site-data via standard localStorage semantics' and 'harmless since it resets each session', but localStorage persists across sessions and across different anonymous users on the same browser, so user B (anonymous) inherits user A's cached PBs and the res...

## Affected code

- `src/lib/pb-cache.ts:10-11`

## Evidence

pb-cache keys are `ft:pb:<mode>|<amount>` in localStorage with no userId namespace and no clear on sign-out; the header comment claims it is 'Reset on logout / clear-site-data via standard localStorage semantics' and 'harmless since it resets each session', but localStorage persists across sessions and across different anonymous users on the same browser, so user B (anonymous) inherits user A's cached PBs and the results-screen crown (test-summary.tsx:472 recordIfPb fallback fires only for anonymous viewers). avg-wpm-cache.ts ('ft:avg-wpm-samples', MAX_SAMPLES 20) is similarly un-namespaced and un-cleared, so one user's completed-run WPMs seed the next user's auto BURST threshold (resolveBurstThreshold). Neither is cleared by handleSignOut.

## Steps to reproduce

User A (signed out) finishes some runs, leaves. User B (signed out) on the same browser sees A's PB crown logic and A's averaged BURST threshold.

## Proposed fix

Namespace these caches by Clerk userId (or a per-session id) and/or clear ft:pb:* and ft:avg-wpm-samples on sign-out; correct the misleading 'resets each session' comment.

## Suggested labels

`severity:low` `area:stats` `security`

---

_Found by: review:stats-progression. Generated from scan run `wf_a630179b-84b`._
