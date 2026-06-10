# FT-005 — Notifications bell is unreachable on mobile — topbar right slot hidden, no drawer entry

> **Severity:** HIGH  •  **Area:** `ui`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

TopBar wraps the `right` slot in `<div className="hidden items-center gap-2 md:flex">{right}</div>`, which hides TopbarActions — including <NotificationsPopover> — at every viewport < 768px. AppDrawerExtras (the mobile drawer) carries only PROFILE/SETTINGS/SIGN OUT/meta links, no bell. The dead code proves the regression: NotificationsPopover ships a mobile-specific button size (`size-11 ...

## Affected code

- `src/components/ft/top-bar.tsx:150`

## Evidence

TopBar wraps the `right` slot in `<div className="hidden items-center gap-2 md:flex">{right}</div>`, which hides TopbarActions — including <NotificationsPopover> — at every viewport < 768px. AppDrawerExtras (the mobile drawer) carries only PROFILE/SETTINGS/SIGN OUT/meta links, no bell. The dead code proves the regression: NotificationsPopover ships a mobile-specific button size (`size-11 ... md:size-9`, notifications-popover.tsx:125) and a full-width mobile sheet layout (`fixed inset-x-2 top-[60px] ... md:absolute md:w-[360px]`, notifications-popover.tsx:146-148), and TopbarActions' own doc comment says 'Mobile (<md): only the notifications bell stays in the topbar' (topbar-actions.tsx:25). Verified in browser at 375×667: the right-cluster wrapper computes display:none. Phone users never see PB, follow, mutual, announcement, or og_granted notifications (race invites are partially recoverable via the friends dock only).

## Steps to reproduce

Sign in, resize to 375px (or open on a phone), look at the topbar on any page — no bell anywhere; open the hamburger drawer — no notifications entry either.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

Every element of the report checks out against the code. (1) src/components/ft/top-bar.tsx:150 wraps the `right` slot in `hidden items-center gap-2 md:flex`, so everything in it is display:none below 768px. (2) src/app/_components/app-chrome.tsx:50 passes `<TopbarActions>` as that `right` slot, and grep confirms NotificationsPopover is mounted ONLY inside topbar-actions.tsx — no other mount point exists. (3) The intent is unambiguous: topbar-actions.tsx:24-27 doc comment says 'Mobile (<md): only the notifications bell stays in the topbar', and every OTHER control in TopbarActions (ModeSwitcher line 36, gear link line 42, sign-in pill line 106, profile trigger line 157) carries its own `hidden ... md:flex/inline-flex` class while the bell deliberately does not — the inner per-control hiding is redundant under the outer wrapper, proving the wrapper is the foreign element. (4) notifications-popover.tsx confirms the dead mobile code: bell button `size-11 ... md:size-9` (line 125) and a mobile full-width sheet `fixed inset-x-2 top-[60px] ... md:absolute md:w-[360px]` (lines 146-148) that can never render below md. (5) AppDrawerExtras (app-drawer-extras.tsx) contains only PROFILE/SETTINGS/sign-out/meta links and mobile-nav.tsx has zero notifications references — no compensating mobile surface. (6) git log -L on the wrapper shows commit ca4a2cf changed `<div className=\"flex items-center gap-2\">{right}</div>` to the `hidden md:flex` version during a topbar redesign — a regression, also contradicting TopBar's own prop doc 'Right-side slot — caller controls responsive visibility.' Impact: signed-in phone users cannot see PB, follow, mutual, announcement, or og_granted notifications anywhere (only race_invite is partially recoverable via the friends dock). Given the project's hard mobile-first mandate (ui-law §10), 'high' is an honest severity for a fully unreachable feature on mobile.

## Proposed fix

Render the NotificationsPopover outside the `hidden md:flex` wrapper (e.g. TopbarActions returns the bell unconditionally and TopBar places it next to the hamburger below md), letting its existing mobile sheet layout do its job.

## Suggested labels

`severity:high` `area:ui` `ui`

---

_Found by: review:ui-misc. Generated from scan run `wf_a630179b-84b`._
