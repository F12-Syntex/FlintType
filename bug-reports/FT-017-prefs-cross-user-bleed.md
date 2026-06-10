# FT-017 — Cross-user prefs bleed: the auth-blind prefs store survives sign-out and flushes into the next signed-in account

> **Severity:** MEDIUM  •  **Area:** `backend`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

loadPrefs() seeds the singleton `cache` synchronously from localStorage key 'flinttype:prefs:v1' (lines 140-144) and never keys on userId. The stale-backend guard (lines 160-165): `if (localVersion > syncedVersion) { cache = {...remote, ...local}; scheduleWrite(); } else { cache = {...local, ...remote} }`.

## Affected code

- `src/lib/prefs-store.ts:132-180`

## Evidence

loadPrefs() seeds the singleton `cache` synchronously from localStorage key 'flinttype:prefs:v1' (lines 140-144) and never keys on userId. The stale-backend guard (lines 160-165): `if (localVersion > syncedVersion) { cache = {...remote, ...local}; scheduleWrite(); } else { cache = {...local, ...remote} }`. In the else (clean) path, any slice present in the PREVIOUS user's local blob but absent from the new user's remote survives in cache and is shown to the new user; the moment the new user changes any setting, writeSlice flushes the merged blob (including the prior user's slices) to the new user's server account. If the prior user had unsynced edits (localVersion>syncedVersion), their whole blob wins and is immediately re-flushed to the new account. handleSignOut (topbar-actions.tsx:147 `clerk.signOut().then(() => router.push('/'))`) does NOT clear localStorage, the module `cache`, or the version stamps; no code anywhere clears 'flinttype:prefs:v1' / 'flinttype:prefs:meta' on auth change (grep for removeItem/localStorage.clear/signOut shows only background-image and a race sessionStorage key).

## Steps to reproduce

On a shared browser: user A signs in, sets a distinctive theme/wordlist, signs out. User B signs in. B sees A's settings; B then changes one setting and A's slices are written to B's account.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Every element of the report holds against the code. prefs-store.ts is completely auth-blind: LS_KEY 'flinttype:prefs:v1' and META_KEY are not namespaced by userId, loadPrefs() seeds the singleton cache from them (lines 139-144), and the merge at 160-165 behaves exactly as quoted — clean path keeps prior-user slices absent from the new user's remote; dirty path (localVersion > syncedVersion) lets the prior user's whole blob win and scheduleWrite() immediately re-flushes it. flush() posts the full cache snapshot and the server route writes it wholesale to the currently-authenticated userId (src/server/routes/prefs/index.ts:31-33), so user A's slices land in user B's account. Grep confirms no code clears either key or resets the module cache on sign-out (only background-image localStorage and a race sessionStorage key are ever removed); all three sign-out paths just call clerk.signOut() + redirect; __resetForTests is test-only. The anon→sign-in carry-over is intentional per the docblock, but lsWrite at line 166 mirrors the signed-in user's blob too, so the carry-over is not gated to anon — the cross-user case is unhandled. It's actually slightly worse than reported: topbar sign-out uses router.push (soft nav), so the in-memory cache still holds A's blob and loadPrefs short-circuits at line 133, meaning B's remote GET never fires until a hard reload. prefs-store.test.ts only covers single-user conflict resolution; nothing asserts isolation. Severity medium is fair: requires a shared browser, leaked data is preferences (including the spectate privacy slice, lifetime stats, profile rank) rather than credentials. Minor mislabel: area is the client lib, not backend.

## Proposed fix

On Clerk sign-out (and on detecting a userId change at load) call __reset of the prefs store + remove the two localStorage keys, or namespace the persisted blob by Clerk userId so a different signed-in user never seeds from another user's blob. The anon->signin carry-over should be gated to the anonymous case only.

## Suggested labels

`severity:medium` `area:backend` `security`

---

_Found by: review:stats-progression. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-017-prefs-cross-user-bleed.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-017-prefs-cross-user-bleed.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
