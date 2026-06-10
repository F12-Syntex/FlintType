# FT-067 — ScrollToTop is a no-op: it scrolls window, but AppChrome's inner div is the actual scroller

> **Severity:** LOW  •  **Area:** `ui`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

AppChrome is `flex h-dvh flex-col overflow-hidden` (app-chrome.tsx:39) with scrolling delegated to the inner `[data-screenshot-root]` div (`overflow-y-auto`, app-chrome.tsx:77). Verified in browser on /changelog: `document.documentElement.scrollHeight === clientHeight` (window never scrollable) while the inner div is scrollable. `window.scrollTo(0,0)` therefore never resets anything;

## Affected code

- `src/app/_components/scroll-to-top.tsx:12`

## Evidence

AppChrome is `flex h-dvh flex-col overflow-hidden` (app-chrome.tsx:39) with scrolling delegated to the inner `[data-screenshot-root]` div (`overflow-y-auto`, app-chrome.tsx:77). Verified in browser on /changelog: `document.documentElement.scrollHeight === clientHeight` (window never scrollable) while the inner div is scrollable. `window.scrollTo(0,0)` therefore never resets anything; same-route param navigations that reuse the DOM (e.g. /profile/a → /profile/b via a friends-dock link) keep the stale scroll position, and Next's own scroll restoration is equally defeated.

## Steps to reproduce

Open a long profile, scroll to the bottom, click another user's profile link from a notification row or the dock directory — the new profile renders at the old scroll offset.

## Proposed fix

Scroll the real container: `document.querySelector('[data-screenshot-root]')?.scrollTo(0, 0)` (or give the scroller a ref/id and reset that) in the pathname effect.

## Suggested labels

`severity:low` `area:ui`

---

_Found by: review:ui-misc. Generated from scan run `wf_a630179b-84b`._
