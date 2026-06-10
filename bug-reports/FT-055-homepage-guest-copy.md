# FT-055 — Homepage copy promises 'everything else works without an account' but Drills and Insights hard-redirect guests to /sign-in

> **Severity:** LOW  •  **Area:** `ui`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The practice page's SEO/About section says: 'click into races, drills, or insights from the navigation. Sign in to keep your history;

## Affected code

- `src/app/page.tsx (About region copy) / observed at http://localhost:3000/drills and /insights`

## Evidence

The practice page's SEO/About section says: 'click into races, drills, or insights from the navigation. Sign in to keep your history; everything else works without an account.' In reality, navigating to /drills and /insights while signed out redirects straight to /sign-in (observed: page.goto('/drills') and '/insights' both land on http://localhost:3000/sign-in), and /drills/[id] renders only 'Sign in to load this drill.' Races genuinely work signed-out (verified: matchmaking vs a bot and private-lobby creation both work as a guest), so the copy is two-thirds wrong while the nav presents Drills/Insights to guests as ordinary destinations.

## Steps to reproduce

Signed out: read the 'How to start' paragraph on /, then click Drills or Insights in the top nav — bounced to /sign-in.

## Proposed fix

Either soften the copy ('drills and insights need an account') or show a signed-out landing/empty state on those routes instead of a hard redirect.

## Suggested labels

`severity:low` `area:ui`

---

_Found by: lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._
