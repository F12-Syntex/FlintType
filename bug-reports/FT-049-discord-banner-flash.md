# FT-049 — DiscordBanner flashes in-then-out on every load for users who dismissed it — the described loading gate doesn't exist

> **Severity:** LOW  •  **Area:** `ui`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The doc comment claims 'while the prefs slice hasn't loaded yet, returns null so the banner doesn't flash in then out for users who've already dismissed', but the code only checks `if (value.discordDismissed) return null` where `value` is the EMPTY_BANNER_STATE default until the prefs blob loads (useRemotePrefs returns defaults pre-load;

## Affected code

- `src/app/_components/discord-banner.tsx:22-28`

## Evidence

The doc comment claims 'while the prefs slice hasn't loaded yet, returns null so the banner doesn't flash in then out for users who've already dismissed', but the code only checks `if (value.discordDismissed) return null` where `value` is the EMPTY_BANNER_STATE default until the prefs blob loads (useRemotePrefs returns defaults pre-load; useRemotePrefs.ts:25 + prefs-store readSlice returns defaults while cache is null). The SSR payload also unconditionally contains the banner — verified `curl /leaderboard | grep data-ft-banner="discord"` matches. So dismissed users see the banner paint, then disappear after hydration + prefs load on every page load.

## Steps to reproduce

Dismiss the Discord banner, hard-reload any chrome'd page — the banner appears for a beat and then vanishes.

## Proposed fix

Expose a `loaded` flag from useRemotePrefs (cache !== null) and return null until it's true, or read the localStorage mirror synchronously in the useState initializer before first paint.

## Suggested labels

`severity:low` `area:ui` `ui`

---

_Found by: review:ui-misc. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-049-discord-banner-flash.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-049-discord-banner-flash.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
