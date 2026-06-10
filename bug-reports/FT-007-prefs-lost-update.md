# FT-007 — user_prefs lost-update: client wholesale prefs.set silently reverts server-written slices

> **Severity:** HIGH  •  **Area:** `db`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Three writers share one user_prefs row with incompatible strategies. (1) The client loads the FULL blob once at mount (prefs-store.ts loadPrefs → backend.prefs.get returns db.userPrefs.get whole blob, including server-only slices adaptRecency/adaptFingerMapHash/selectedTags) and flush() POSTs the entire cached blob: `await backend.prefs.set({ data: snapshot })` → server does wholesale replace `db.userPrefs.set(userId...

## Affected code

- `src/lib/prefs-store.ts:243`
- `src/server/routes/prefs/index.ts:32`
- `src/server/routes/adapt/prefs.ts:54-59`
- `src/server/routes/profile/index.ts:200`

## Evidence

Three writers share one user_prefs row with incompatible strategies. (1) The client loads the FULL blob once at mount (prefs-store.ts loadPrefs → backend.prefs.get returns db.userPrefs.get whole blob, including server-only slices adaptRecency/adaptFingerMapHash/selectedTags) and flush() POSTs the entire cached blob: `await backend.prefs.set({ data: snapshot })` → server does wholesale replace `db.userPrefs.set(userId, input.data)`. (2) adapt.submit writes adaptRecency/adaptFingerMapHash server-side on EVERY completed test via persistAdaptPrefs — itself a read-modify-write `db.userPrefs.set(userId, {...prefs.raw, ...})`, not the atomic merge(). (3) profile.setTags writes selectedTags via the atomic userPrefs.merge — but the edit-profile dialog (edit-profile-dialog.tsx:137) never writes the slice into the client prefs cache, so the client cache stays stale. Consequence A: complete N tests, then change ANY setting (theme chip, caret style) → the 400ms-debounced flush sends the mount-time blob → adaptRecency/adaptFingerMapHash regress to mount-time values, silently degrading the adapt algorithm's repeat-penalty state. Consequence B: toggle tag visibility in Edit Profile, then change any customise setting → selectedTags reverts to the mount-time selection. Consequence C (reverse direction): a client flush landing between adapt.submit's loadAdaptPrefs read and its final wholesale set (the handler does model upserts + Clerk friend-pb fan-out in between, easily 100ms–1s) gets clobbered — the user's just-saved setting reverts, which is exactly the 'theme reverts on its own' bug class the localVersion/syncedVersion guard in prefs-store was built to stop (that guard only protects the load path, not server-side wholesale writes). monkeytype import/disconnect (monkeytype/index.ts:186,226) are the same read-modify-write pattern.

## Steps to reproduce

Signed in: open app (prefs.get caches blob) → Edit profile → toggle a tag chip (auto-saves via profile.setTags merge) → open Customise and flip any chip → wait 400ms debounce → reload: tag selection is back to its pre-toggle state. Equivalent: complete several practice tests, then change a setting, then inspect user_prefs.adaptRecency — it matches the page-load value, not the post-test value.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

Every cited mechanism checks out on direct code reading. (1) Client side: src/lib/prefs-store.ts loadPrefs() caches the FULL blob from backend.prefs.get (the prefs.get handler at src/server/routes/prefs/index.ts:25 returns ctx.db.userPrefs.get — the whole row, including adaptRecency, adaptFingerMapHash, selectedTags, monkeytypeStats), the cache is never invalidated or refreshed during a session, and flush() (line 238-243) POSTs the entire snapshot: `backend.prefs.set({ data: snapshot })`. The prefs.set handler (index.ts:32) does `db.userPrefs.set(userId, input.data)`, and userPrefsRepo.set (src/db/server/repositories/user-prefs.ts:43-51) is a documented wholesale jsonb replace. setUserPrefsInputSchema is a permissive z.record with only a size cap — no server-owned-key stripping anywhere. (2) adapt.submit (src/server/routes/adapt/submit.ts) calls loadAdaptPrefs at line 29 and persistAdaptPrefs at line 245 — with model bulk-upserts, PB logic, and a Clerk friend-PB fan-out awaited in between — and persistAdaptPrefs (prefs.ts:54-59) does `db.userPrefs.set(userId, {...prefs.raw, ...})`, a classic read-modify-write, NOT the atomic merge() that exists in the same repo file. (3) profile.setTags does use merge (profile/index.ts:200), but edit-profile-dialog.tsx only calls backend.profile.setTags — grep confirms no client code (src/lib has zero hits for selectedTags/adaptRecency/monkeytypeStats) ever writes the slice into the prefs-store cache, so a subsequent settings change flushes the stale mount-time blob, reverting — or outright deleting, if selectedTags was absent at mount — the just-saved selection. (4) monkeytype import/disconnect (monkeytype/index.ts:186, 226) are the same read-modify-write set pattern; the inline comment even says "read-merge-write so unrelated prefs slices survive," which only holds against itself, not against a concurrent client flush. The localVersion/syncedVersion guard in prefs-store protects only the client LOAD path against a stale server copy; it has no effect on the server-side wholesale writes and in fact makes things worse on reload (localVersion > syncedVersion re-flushes the stale localStorage blob over fresh server slices). No test asserts the opposite — user-prefs.test.ts tests merge semantics in isolation; profile/index.test.ts:318-325 even demonstrates merge preserving other slices, but nothing covers the cross-writer race. The repro is credible: complete tests (adaptRecency advances server-side) or toggle a tag, then flip any customise chip → 400ms debounce flushes the mount-time blob → server slices regress. This is an ordinary user flow, hit routinely. Severity high is honest: it's a lost-update data-integrity bug across three writers on every signed-in user's row, with a user-visible symptom (tag selection reverts/disappears), silent adapt-algorithm state regression on essentially any session mixing typing and settings changes, and a race (consequence C) that reintroduces the previously-fixed "setting reverts on its own" class.

## Proposed fix

Make slice writes atomic end-to-end: have the client flush per-slice patches through a `prefs.merge`-style route (server uses the existing jsonb || userPrefs.merge), and reserve userPrefs.set for import/migration flows. Switch persistAdaptPrefs to db.userPrefs.merge({adaptRecency, adaptFingerMapHash}). At minimum, strip server-owned keys (adaptRecency, adaptFingerMapHash, selectedTags, monkeytypeStats) from the client-supplied blob in the prefs.set handler before persisting.

## Suggested labels

`severity:high` `area:db` `data-loss`

---

_Found by: review:db-social. Generated from scan run `wf_a630179b-84b`._
