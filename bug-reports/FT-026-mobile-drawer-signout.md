# FT-026 — Mobile nav drawer shows SIGN OUT / PROFILE to signed-out users; no Sign in affordance

> **Severity:** MEDIUM  •  **Area:** `ui`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

`<SignOutLink dark={dark} />` is rendered unconditionally — no Clerk auth gate. In the browser at 375x667, signed out (Clerk keyless dev), the hamburger drawer footer shows PROFILE · SETTINGS · SIGN OUT · DISCORD · GITHUB · STATUS · PRIVACY. The mobile TopBar at <md collapses to logo + hamburger only (no Sign in pill), so a signed-out mobile user's only visible auth control is a bogus 'SIGN OUT' button;

## Affected code

- `src/app/_components/app-drawer-extras.tsx:65 (and src/app/_components/sign-out-link.tsx)`

## Evidence

`<SignOutLink dark={dark} />` is rendered unconditionally — no Clerk auth gate. In the browser at 375x667, signed out (Clerk keyless dev), the hamburger drawer footer shows PROFILE · SETTINGS · SIGN OUT · DISCORD · GITHUB · STATUS · PRIVACY. The mobile TopBar at <md collapses to logo + hamburger only (no Sign in pill), so a signed-out mobile user's only visible auth control is a bogus 'SIGN OUT' button; the only path to sign-in is tapping PROFILE and being redirected. Desktop shows a proper 'Sign in' link.

<!-- evidence-embedded -->

**Captured screenshots:**

![Mobile nav drawer open](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/mobile-nav-drawer.png)

*Mobile nav drawer open.*

## Steps to reproduce

DevTools 375x667, signed out, open http://localhost:3000/, tap the hamburger, look at the drawer footer.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

Verified by reading the code. app-drawer-extras.tsx renders <SignOutLink> (line 65) plus PROFILE/SETTINGS links with no auth gate; sign-out-link.tsx is an ungated button calling useClerk().signOut(). AppChrome mounts AppDrawerExtras unconditionally into MobileNav's drawerExtras slot, which is also auth-unaware. On mobile (<md) the topbar's signed-out 'Sign in' pill is `hidden md:flex` (topbar-actions.tsx:106), the gear and ModeSwitcher are md+-only, and NotificationsPopover returns null for anonymous users (notifications-popover.tsx:110) — so a signed-out mobile user's chrome is logo + hamburger, and the drawer shows a bogus SIGN OUT with no sign-in affordance anywhere. The desktop ProfileLink even carries a comment that the topbar 'should never pretend the user is signed in when they aren't' — the same fix was never applied to the drawer extras. Severity corrected to medium: no crash or data risk, signOut() without a session is harmless, the app works anonymously, and sign-in is reachable indirectly — but it is a genuine misleading-affordance/missing-CTA defect hit by every signed-out mobile user.

## Proposed fix

Gate the drawer extras on auth state: render a 'SIGN IN' link (to /sign-in) when signed out and SIGN OUT/PROFILE when signed in (Clerk `<Show when=...>` or useUser()).

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **lane:appearance+responsive** — Mobile nav drawer shows 'SIGN OUT' (and PROFILE) while signed out; no Sign in entry (`src/app/_components/app-drawer-extras.tsx:62-65`)

## Suggested labels

`severity:medium` `area:ui` `ui`

---

_Found by: lane:appearance+responsive, lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-026-mobile-drawer-signout.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-026-mobile-drawer-signout.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
