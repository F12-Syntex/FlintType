# FT-022 — Friends-dock pill overlaps the 'Design with AI' launcher at narrow widths on /customise

> **Severity:** MEDIUM  •  **Area:** `customise`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Both are `fixed z-40` in the same bottom band. Measured at 375x667 on /customise/appearance: AI pill rect x=111–264, y=607–655 (ai-dock.tsx:45 `fixed left-1/2 z-40 -translate-x-1/2`); friends dock rect x=161–363, y=611–659 (friends-dock/index.tsx:183-191, bottom-right anchored).

## Affected code

- `src/app/customise/_components/ai-dock.tsx:45`

## Evidence

Both are `fixed z-40` in the same bottom band. Measured at 375x667 on /customise/appearance: AI pill rect x=111–264, y=607–655 (ai-dock.tsx:45 `fixed left-1/2 z-40 -translate-x-1/2`); friends dock rect x=161–363, y=611–659 (friends-dock/index.tsx:183-191, bottom-right anchored). ~103px horizontal overlap — the dock paints over the right two-thirds of the AI pill ('DES…' visible, rest covered), making it partially illegible/unclickable. Screenshots at 375 on both /customise/appearance and /customise/behaviour show the collision. Affects any viewport narrower than ~560px; in production this hits signed-in mobile users (dock hidden when signed out in prod; dev shows dummy-data dock).

## Steps to reproduce

Sign in (or run dev where the dock shows dummy data), open /customise/appearance at 375px width, look at the bottom edge — the friends pill sits on top of the Design with AI pill.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code confirms the collision. CustomiseAiDock (src/app/customise/_components/ai-dock.tsx:43-56) renders a fixed, bottom-centered h-11 pill at z-40 with bottom = footerHeight + 0.75rem, on every /customise page except the AI studio and themes explorer. FriendsDock (src/components/friends-dock/index.tsx:176-258) renders a fixed, bottom-right h-11 pill at z-40 with bottom = footerHeight + 0.5rem (the 0.75rem gap requires min-height:900px, so phones get 0.5rem), right = 0.75rem; its HIDDEN_PREFIXES (line 23: /race, /live, /sign-in, /sign-up, /landing) do not cover /customise, and it shows for any signed-in user (or always in dev). Both measure the same [data-ft-footer] element, so their vertical bands overlap by ~40px regardless of footer state. Horizontally at 375px the centered AI pill (~150-160px wide via px-5 + 14 tracked uppercase chars at 11px) spans roughly x=110-265, while even the minimal "Friends" pill (Users icon + label, ~125px) reaches left to ~x=238 — overlap exists with zero friends and grows to ~100px with the avatar stack the finder measured. No responsive branch, guard, or test prevents the overlap; useIsMobile only swaps the dock's expanded surface, not the pinned pill. The dock paints over and intercepts clicks on the covered portion of the AI launcher. Severity medium is fair: every signed-in mobile user on /customise sees it, but the launcher remains partially clickable and the studio is reachable elsewhere.

## Proposed fix

At <sm viewports, stack the two (lift the AI pill above the dock by the dock's height, mirroring how the dock already offsets by footer height), or collapse the dock to a smaller badge on customise routes.

## Suggested labels

`severity:medium` `area:customise` `ui`

---

_Found by: lane:appearance+responsive. Generated from scan run `wf_a630179b-84b`._
