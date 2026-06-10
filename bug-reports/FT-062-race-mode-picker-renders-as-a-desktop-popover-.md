# FT-062 — Race mode picker renders as a desktop popover on mobile, violating the §10.5 bottom-sheet mandate

> **Severity:** LOW  •  **Area:** `race`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

ModePicker is a plain `<DropdownMenu>` with no `useIsMobile()` branch and no `<MobileSheet>`. Verified at 375x667 on /race: clicking '1V1 · head-to-head' opens a floating popover under the trigger (screenshot), while every comparable picker (customise section picker, theme palette picker, leaderboard filters, wordlist picker) correctly opens a bottom sheet at the same width.

## Affected code

- `src/app/race/_components/mode-picker.tsx:33-66`

## Evidence

ModePicker is a plain `<DropdownMenu>` with no `useIsMobile()` branch and no `<MobileSheet>`. Verified at 375x667 on /race: clicking '1V1 · head-to-head' opens a floating popover under the trigger (screenshot), while every comparable picker (customise section picker, theme palette picker, leaderboard filters, wordlist picker) correctly opens a bottom sheet at the same width. ui-law §10.5: 'Any popover or dropdown that hosts a list of choices … must render as a fixed-height bottom-anchored modal on mobile.'

## Steps to reproduce

375px viewport, /race, tap the MODE chip — a popover opens instead of a bottom sheet.

## Proposed fix

Branch on useIsMobile() and render the mode list in a MobileSheet like leaderboard's MobileLeaderboardPicker.

## Suggested labels

`severity:low` `area:race` `ui` `multiplayer`

---

_Found by: lane:appearance+responsive. Generated from scan run `wf_a630179b-84b`._
