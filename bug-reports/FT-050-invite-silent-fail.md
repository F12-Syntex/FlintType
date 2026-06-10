# FT-050 — FollowButton 'Invite to a race' fails silently with no loading or error state

> **Severity:** LOW  •  **Area:** `ui`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The menu item's onSelect awaits `createLobbyAndInvite(backend, userId)` which returns `null` on any failure (invite-to-lobby.ts:38-40 swallows the error), and the handler only navigates when a slug comes back: `if (slug) router.push(...)`.

## Affected code

- `src/components/follow-button.tsx:99-108`

## Evidence

The menu item's onSelect awaits `createLobbyAndInvite(backend, userId)` which returns `null` on any failure (invite-to-lobby.ts:38-40 swallows the error), and the handler only navigates when a slug comes back: `if (slug) router.push(...)`. There is no loading indicator while the lobby is created and no error surface when it fails — the menu just closes and nothing happens, violating ui-law §6.3 (every async action surfaces loading + error). The same silent-null path exists wherever createLobbyAndInvite is reused.

## Steps to reproduce

With the race authority unreachable (or any race.challenge.create failure), open a friend's profile → ⋯ → 'Invite to a race': the menu closes and nothing visible happens.

## Proposed fix

Route the call through the existing useAsyncAction in the component (disable + relabel during flight) and render the error line the component already has when the result is null.

## Suggested labels

`severity:low` `area:ui` `multiplayer`

---

_Found by: review:ui-misc. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-050-invite-silent-fail.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-050-invite-silent-fail.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
