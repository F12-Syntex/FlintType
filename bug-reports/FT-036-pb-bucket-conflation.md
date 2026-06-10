# FT-036 — TIME-mode and WORDS-mode runs collapse to the same (mode, amount) PB/leaderboard bucket

> **Severity:** MEDIUM  •  **Area:** `stats`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

submitMode = raceMode ? 'race' : adaptOn ? 'training' : 'casual', and durationOrWordCount: length. The original Mode (WORDS/TIME/QUOTE) is discarded — the persisted test row's `mode` is only casual/training/reverse_adaptive/race (testModeSchema, types/adapt.ts:56-61) and durationOrWordCount holds seconds for TIME but word-count for WORDS, with nothing recording which.

## Affected code

- `src/app/_components/practice-state.tsx:587-597`

## Evidence

submitMode = raceMode ? 'race' : adaptOn ? 'training' : 'casual', and durationOrWordCount: length. The original Mode (WORDS/TIME/QUOTE) is discarded — the persisted test row's `mode` is only casual/training/reverse_adaptive/race (testModeSchema, types/adapt.ts:56-61) and durationOrWordCount holds seconds for TIME but word-count for WORDS, with nothing recording which. So a 60-second casual run and a custom-60-word casual run share PB bucket (casual,60) in tests.bestBefore (repositories/tests.ts:117), profile derivePersonalBests groups by `casual|60` (derive-stats.ts:185), and leaderboard preset t60 (PRESET_AMOUNT 60) ranks both together — despite the leaderboard type comment claiming the numeric domains never overlap (they do once WORDS custom counts of 15/30/60/120 are allowed; CUSTOM_LIMITS max=1000 in mode-bar.tsx). Corroborating: submit.ts formatLength (lines 283-289) has a `mode === 'time' || /time/i.test(mode)` branch that is permanently dead because no submitted mode is ever 'time', so every TIME-mode PB notification renders 'Casual 60' instead of '...60s' and is indistinguishable from a word run. derive-stats.ts:362 already acknowledges 'mode doesn't distinguish a time test from a words test'.

## Steps to reproduce

Do a 30-second casual TIME run, then a custom 30-word casual WORDS run. Both land in PB bucket (casual,30); the profile Personal Bests list and the 'casual'/t30 leaderboard merge them, and the PB notification body cannot tell them apart.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Every element of the report checks out in code. (1) practice-state.tsx:584-597 submits mode as only casual/training/race and durationOrWordCount: state.length, where length is seconds in TIME mode (the countdown uses state.length * 1000) and a word count in WORDS mode — testModeSchema (types/adapt.ts:56-61) carries no time/words discriminator. (2) The collision is reachable: mode-bar.tsx CUSTOM_ALLOWED.WORDS = true with CUSTOM_LIMITS 1–1000, so a custom 15/30/60/120-word casual run shares bucket (casual, N) with a 15/30/60/120-second TIME casual run. (3) Consumers conflate: tests.ts bestBefore (lines 117-137) keys PB detection on (mode, durationOrWordCount); derive-stats.ts:185 groups profile personal bests by the same pair; leaderboard.ts:26-28 explicitly (and now falsely) asserts the numeric domains never overlap, so the t15/t30/t60/t120 boards rank custom-word sprints against genuine timed runs — including a cheap gaming vector (a 15-word sprint posts inflated WPM on the t15 board). (4) submit.ts formatLength (283-289) has a permanently dead `mode === 'time' || /time/i.test(mode)` branch since no submitted mode ever matches; every TIME PB notification renders 'Casual 60' instead of the intended 'Casual 60s' (the doc comment at line 264 shows the unreachable intended output). derive-stats.ts:361-364 already documents the missing discriminator as a known gap. No guard, test, or upstream check separates the domains. Medium severity is fair: real PB/leaderboard data-integrity conflation requiring custom word counts equal to time presets, plus a guaranteed unit-label defect on every TIME PB notification.

## Proposed fix

Persist a time-vs-words discriminator on the test row (e.g. a `lengthKind: 'time'|'words'|'quote'` column, or keep TIME/WORDS in the mode value) so PB buckets, profile bests, and leaderboard presets don't conflate seconds with word counts. Then formatLength can actually distinguish them.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **review:ui-misc** — Amount-keyed PB/leaderboard buckets conflate seconds with word counts — custom 15/30/60/120-word runs display as time runs (`src/app/profile/_components/personal-bests.tsx:77-89`)

## Suggested labels

`severity:medium` `area:stats`

---

_Found by: review:stats-progression, review:ui-misc. Generated from scan run `wf_a630179b-84b`._
