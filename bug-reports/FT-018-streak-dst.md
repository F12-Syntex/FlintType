# FT-018 — Daily streak / activity-heatmap day math breaks across DST transitions (fixed 86,400,000 ms day step)

> **Severity:** MEDIUM  •  **Area:** `stats`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

deriveStreak walks days by an exact 24h constant. Longest-streak loop: `if (prev != null && ts - prev === 86_400_000) run += 1; else run = 1;` (line 133) where ts/prev are `new Date(y,m,d).getTime()` (local midnights). Across a DST boundary consecutive local midnights differ by 23h (82,800,000) or 25h (90,000,000), so the `=== 86_400_000` test is false and the streak resets at every transition.

## Affected code

- `src/app/profile/_components/derive-stats.ts:133`

## Evidence

deriveStreak walks days by an exact 24h constant. Longest-streak loop: `if (prev != null && ts - prev === 86_400_000) run += 1; else run = 1;` (line 133) where ts/prev are `new Date(y,m,d).getTime()` (local midnights). Across a DST boundary consecutive local midnights differ by 23h (82,800,000) or 25h (90,000,000), so the `=== 86_400_000` test is false and the streak resets at every transition. Current-streak loop (lines 149-158) does `cursor -= 86_400_000` from local-midnight-today then checks `days.has(dateKey(cursor))`. Worked example (US spring-forward, midnight Mar 9->Mar 10 path): subtracting 24h from local-midnight-Mar-9 lands at 11pm Mar 8 (because Mar 8 was a 23h day), so dateKey yields Mar 8 and the Mar 9 entry... in the reverse direction the spring-forward day is SKIPPED entirely, cutting the current streak short. deriveActivity (line 239, `startMs + i*86_400_000`) shares the same fixed-ms-per-day assumption.

## Steps to reproduce

Set the machine timezone to a DST-observing zone (e.g. America/New_York), seed completed tests on three consecutive calendar days spanning the March spring-forward Sunday, open /profile. The current and longest streak read 1 short of the true 3.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Verified by reading src/app/profile/_components/derive-stats.ts and by empirical Node runs in a DST-observing zone (Europe/London). (1) Longest streak (line 133): day keys are local midnights via new Date(y,m,d).getTime(); across DST the consecutive-midnight delta is 82,800,000 (spring) or 90,000,000 (fall), so the strict `=== 86_400_000` check fails and the run resets at every transition — simulation of 3 consecutive days spanning spring-forward yields longest=2. Because the stat is recomputed from full history each render, any longest streak spanning a transition is permanently understated. (2) Current streak (lines 149–157): subtracting fixed 24h from local midnight skips the spring-forward day entirely (walk back from Mar 30 produces keys Mar 30, Mar 28, Mar 27 — Mar 29 never visited), undercounting or breaking the current streak; fall-back happens to survive (cursor lands at 01:00, same date key), a minor overstatement in the finder's evidence but the core claim holds. (3) No mitigation exists: derive-stats.test.ts has zero streak tests, and there is no timezone/UTC normalization upstream. deriveActivity shares the fixed-ms assumption (lesser effect: hour drift / possible duplicate day cell at fall-back). Severity medium is fair: affects most users in DST zones, user-visible gamification stat, but display-only with no data loss.

## Proposed fix

Walk by calendar date components (Date with setDate(getDate()±1)) and compare normalized day keys, not by adding/subtracting a fixed 86,400,000ms; for the longest run compare key-adjacency rather than exact ms delta.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **review:ui-misc** — Streak and activity-heatmap day math uses fixed 86,400,000 ms steps — breaks across DST transitions (`src/app/profile/_components/derive-stats.ts:132-159`)

## Suggested labels

`severity:medium` `area:stats`

---

_Found by: review:stats-progression, review:ui-misc. Generated from scan run `wf_a630179b-84b`._
