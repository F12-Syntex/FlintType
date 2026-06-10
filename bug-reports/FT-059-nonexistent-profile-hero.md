# FT-059 — Nonexistent-user profile renders a zeroed fake profile hero instead of a not-found state

> **Severity:** LOW  •  **Area:** `ui`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Visiting /profile/some-nonexistent-user (API /api/history/publicProfile returns 404) still renders a full profile hero for the fictitious user: avatar placeholder, h1 'some-nonexistent-user', stats strip 'TESTS 0 · TIME TYPING 0s · BEST WPM 0 · STREAK 0d', 'LEVEL 1' with a 0/1,000 XP bar — and only below it the error line 'No flinttype profile for @some-nonexistent-user.' The page title is also set to '@some-nonexist...

## Affected code

- `src/app/profile/[username] (observed at http://localhost:3000/profile/some-nonexistent-user)`

## Evidence

Visiting /profile/some-nonexistent-user (API /api/history/publicProfile returns 404) still renders a full profile hero for the fictitious user: avatar placeholder, h1 'some-nonexistent-user', stats strip 'TESTS 0 · TIME TYPING 0s · BEST WPM 0 · STREAK 0d', 'LEVEL 1' with a 0/1,000 XP bar — and only below it the error line 'No flinttype profile for @some-nonexistent-user.' The page title is also set to '@some-nonexistent-user'. The shareable surface fabricates a zeroed profile for any string.

## Steps to reproduce

Open /profile/<any-garbage> signed out.

## Proposed fix

When publicProfile 404s, replace the hero with the not-found message (or call notFound()) instead of rendering the zeroed hero above the error.

## Suggested labels

`severity:low` `area:ui`

---

_Found by: lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-059-nonexistent-profile-hero.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-059-nonexistent-profile-hero.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
