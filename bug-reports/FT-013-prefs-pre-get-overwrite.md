# FT-013 — Changing any setting before the prefs GET resolves on a fresh device overwrites that slice with defaults

> **Severity:** MEDIUM  •  **Area:** `prefs sync`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

useRemotePrefs.update builds the full slice from defaults when the cache hasn't loaded: `const cur = readSlice(key, defaults)` returns bare defaults while cache === null, so writeSlice persists {...DEFAULTS, ...patch} as the COMPLETE slice and bumps localVersion.

## Affected code

- `src/lib/prefs-store.ts:160-162`

## Evidence

useRemotePrefs.update builds the full slice from defaults when the cache hasn't loaded: `const cur = readSlice(key, defaults)` returns bare defaults while cache === null, so writeSlice persists {...DEFAULTS, ...patch} as the COMPLETE slice and bumps localVersion. When the in-flight loadPrefs then resolves, localVersion(1) > syncedVersion(0) triggers the local-wins merge `cache = { ...remote, ...local }` — the freshly-defaulted local slice replaces the user's entire server-side slice (the merge is slice-granular, not field-granular) — and scheduleWrite() flushes that back to the server. Net effect: a signed-in user on a new device/cleared storage who flips one appearance toggle within the GET latency window loses every other appearance customisation they had, permanently. The same local-wins rule also means any device holding an unsynced edit (a save that 401'd or failed) shields ALL of its local slices from newer cross-device changes on every subsequent load, not just the edited one.

## Steps to reproduce

Signed-in account with several appearance customisations → open the app in a fresh browser profile and click any appearance chip within the first few hundred ms (throttle the network to make the window easy) → server blob's appearance slice is replaced by defaults + that one change.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code reading confirms every link in the chain. (1) On a fresh device, prefs-store cache is null until the GET resolves (lsRead seeds nothing); useRemotePrefs.update (use-remote-prefs.ts:49-54) calls readSlice which returns bare defaults when cache is null (prefs-store.ts:186-187), then writeSlice persists {...defaults, ...patch} as the complete slice and bumps localVersion to 1 — no guard queues or defers writes during the in-flight load. (2) When loadPrefs resolves, localVersion(1) > syncedVersion(0) takes the local-wins branch `cache = { ...remote, ...local }` (prefs-store.ts:160-162) — a shallow, slice-granular spread that replaces the server's slice for the touched key with the fabricated defaults+patch — and scheduleWrite() flushes it. (3) backend.prefs.set → db.userPrefs.set is explicitly documented as a wholesale blob replace (src/db/server/repositories/user-prefs.ts), and lsWrite overwrites the local mirror, so the loss is permanent with no recovery path. If the 400ms debounce fires before the GET resolves, the wholesale set briefly wipes ALL other slices too (later restored by the dirty-branch re-flush; the touched slice stays lost). prefs-store.test.ts covers clean/dirty/post-save loads but never a write landing while the first GET is in flight on an empty-localStorage device — the local-wins design is a deliberate fix for the theme-revert bug, and this is unguarded collateral of it. The secondary claim (one unsynced edit shields all local slices from cross-device updates) is also accurate from the blob-global version stamp, though tests assert that behaviour as intended. Severity medium is honest: the window is the GET latency (hundreds of ms, seconds on throttled/cold paths) and requires immediate interaction on a fresh profile, but the consequence is permanent loss of an entire customisation slice for a signed-in user.

## Proposed fix

Don't allow writeSlice to fabricate a full slice from defaults before the first load completes (queue the patch and merge it onto the loaded slice), or make the stale-guard merge field-level per slice (merge remote slice under local slice instead of replacing it).

## Suggested labels

`severity:medium` `area:prefs-sync` `data-loss`

---

_Found by: review:customise-prefs. Generated from scan run `wf_a630179b-84b`._
