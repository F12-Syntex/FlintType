# FT-029 — Profile level / 'Top by Level' / public-profile stats are client-forgeable via prefs.set

> **Severity:** MEDIUM  •  **Area:** `backend / leaderboard / profile / prefs`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

prefs.set stores an entirely opaque blob: `setUserPrefsInputSchema = { data: z.record(z.string(), z.unknown()) }` (only a 256KB size refinement), and the handler writes it wholesale: `db.userPrefs.set(meta.userId, input.data)`.

## Affected code

- `src/types/user-prefs.ts:15-33`
- `src/server/routes/prefs/index.ts:29-35`
- `src/server/routes/leaderboard/index.ts:268-297`
- `src/lib/lifetime-stats.ts:36-46`
- `src/server/routes/history/index.ts:156-184`

## Evidence

prefs.set stores an entirely opaque blob: `setUserPrefsInputSchema = { data: z.record(z.string(), z.unknown()) }` (only a 256KB size refinement), and the handler writes it wholesale: `db.userPrefs.set(meta.userId, input.data)`. That same user-owned blob is then trusted as authoritative for *public competitive ranking and display*: leaderboard.topByLevel reads `prefs.monkeytypeStats.completedTests` (index.ts:268-271) and `readLifetimeStats(prefs)` → `{drillsCompleted,racesFinished,racesWon}`, folds them into `totalXp = combined*XP_PER_TEST + computeTotalXp(lifetime)` and re-sorts the public board by that total (index.ts:295-301). history.summary / history.publicProfile surface the same `monkeytypeStats` PBs/lifetime + `lifetimeStats` to any visitor (history/index.ts:156-184). useLifetimeStats writes these counters through the ordinary prefs.set path (use-lifetime-stats.ts), so they are inherently client-controlled — a user can POST /api/prefs/set {"data":{"lifetimeStats":{"drillsCompleted":100000000,"racesFinished":0,"racesWon":0}}} (or a giant monkeytypeStats.completedTests) and arbitrarily inflate their level/XP on the public Top-by-Level board and their profile hero. selectedTags is the one field correctly re-validated against eligibility at read time; the XP/stat fields are not.

## Steps to reproduce

As any signed-in user: POST /api/prefs/set {"data":{"lifetimeStats":{"drillsCompleted":1000000,"racesFinished":0,"racesWon":0},"monkeytypeStats":{"importedAt":<now>,"completedTests":1000000,"startedTests":1000000,"timeTyping":0,"pbs":{"time":{},"words":{}}}}}. Then POST /api/leaderboard/topByLevel {} and view your /profile — level/XP reflect the forged numbers. (Same auth limitation as above; finding from code path.)

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

The cited code behaves exactly as claimed. prefs.set (src/server/routes/prefs/index.ts:31-34) writes the entire client blob wholesale (db.userPrefs.set(meta.userId, input.data)) with only a 256KB size refinement (user-prefs.ts:15-33) and zero field-level validation. lifetimeStats is written purely client-side (use-lifetime-stats.ts → useRemotePrefs → prefs.set); readLifetimeStats (lifetime-stats.ts:48-52) only floors to non-negative integers, accepting arbitrarily large values. monkeytypeStats DOES have a legitimate server-verified writer (the monkeytype.import route fetches real data via the Ape Key), but that does not close the hole: prefs.set is an open parallel write path that can overwrite the monkeytypeStats slice with forged {completedTests, importedAt, pbs}, and nothing checks the slice's provenance. These untrusted blobs are then trusted as authoritative: leaderboard.topByLevel (index.ts:268-301) reads prefs.monkeytypeStats.completedTests + readLifetimeStats(prefs), folds them into totalXp = combined*XP_PER_TEST + computeTotalXp(lifetime), and re-sorts the public board by that total; history.summary/publicProfile (index.ts:156-184) surface the same forged monkeytypeStats PBs + lifetimeStats to any visitor. The asymmetry the finder notes is real and confirmed: selectedTags IS re-validated against server-resolved eligibility (applyTagSelection(eligibleTags, selection)), but the XP/stat fields are trusted raw. No upstream guard refutes the finding. I downgrade severity from high to medium: the profile vector is unconditionally exploitable with one API call, but the impact is competitive-integrity/vanity-metric forgery (level, XP, leaderboard rank) — no data breach, no privilege escalation, no financial impact — and the leaderboard candidate pool is gated by real local test count (db.tests.topByLevel returns ~25-50 rows ordered by actual COUNT(*) before the forged-XP re-sort), so a fresh account cannot inject itself into the board purely by forging stats; it can only reorder within an already-earned pool and inflate its own profile.

## Proposed fix

Do not derive public rankings or displayed lifetime stats from the client-writable prefs blob. Maintain drill/race/import counters in server-authoritative storage incremented by trusted server events (drill completion, the race authority's finish, the verified monkeytype.import fetch), and have topByLevel/profile read those — not user_prefs. If the blob must stay opaque, namespace the trusted counters outside it and ignore any client writes to them.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **review:backend-routes** — Profile level and top-by-level leaderboard ordering are inflatable via unvalidated user-prefs blob (lifetimeStats / monkeytypeStats.complete (`src/server/routes/prefs/index.ts:29; src/types/user-prefs.ts:15; src/server/routes/leaderboard/index.ts:266`)

## Suggested labels

`severity:medium` `area:backend` `security`

---

_Found by: probe:live-api, review:backend-routes. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-029-level-xp-forgeable.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-029-level-xp-forgeable.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
