# FT-068 — Settings export/import omits the 'audio' slice (and 'handLayout') — JSON round-trip drops click-sound settings

> **Severity:** LOW  •  **Area:** `customise/import-export`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

KNOWN_SLICES = ['caret','appearance','behaviour','background','keyboard','theme','palette','practice'] — the 'audio' slice (keypressClickEnabled / keypressClickVolume, a first-class control on Customise → Behaviour → Audio, src/lib/audio-prefs.ts) is absent, so buildFlinttypeExport drops it on export and planFlinttypeImport ignores it on import.

## Affected code

- `src/lib/import-export.ts:15-24`

## Evidence

KNOWN_SLICES = ['caret','appearance','behaviour','background','keyboard','theme','palette','practice'] — the 'audio' slice (keypressClickEnabled / keypressClickVolume, a first-class control on Customise → Behaviour → Audio, src/lib/audio-prefs.ts) is absent, so buildFlinttypeExport drops it on export and planFlinttypeImport ignores it on import. A user who exports 'flinttype-settings-<date>.json' and imports on another machine loses their click-sound settings with no warning. (The 'spectate' slice is also omitted; that one is arguably intentional since it carries a per-friend privacy blocklist, but it deserves an explicit comment either way.)

## Steps to reproduce

Enable Keypress click → Manage → Export settings → clear storage (or use another browser) → Manage → Restore from flinttype JSON → keypress click is off.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Verified against code: audio prefs are stored in the shared prefs-store blob under slice key "audio" (src/lib/audio-prefs.ts:29 via useRemotePrefs -> readSlice/writeSlice), which is the exact store buildFlinttypeExport snapshots via getCache(). KNOWN_SLICES (src/lib/import-export.ts:15-24) omits "audio", so the export loop (line 41-43) drops it and planFlinttypeImport (line 116) ignores it even if present in the JSON. Git history proves oversight, not intent: import-export.ts last changed 2026-05-11, the audio slice landed 2026-05-19 (2c48344) without updating KNOWN_SLICES; no comment or test marks it as a deliberate exclusion (unlike the documented MonkeyType theme exclusion in the same file). The repro is credible for anonymous users / cleared storage / cross-account moves. Severity downgraded to low: signed-in users get audio prefs back from the server-synced blob on any device (prefs-store's /api/prefs/get is source of truth), the audio slice has only two fields and defaults to off, and import never deletes an existing local audio slice — so the practical loss window is narrow. Same omission also applies to the handLayout slice (src/lib/use-hand-layout.ts), worth fixing together.

## Proposed fix

Add 'audio' to KNOWN_SLICES (and document why spectate/profileRank/drillProgress are deliberately excluded).

## Suggested labels

`severity:low` `area:customise` `ui`

---

_Found by: review:customise-prefs. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-068-export-omits-audio.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-068-export-omits-audio.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
