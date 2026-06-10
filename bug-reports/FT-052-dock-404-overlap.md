# FT-052 — Friends dock pill overlaps and occludes the 404 page footer text

> **Severity:** LOW  •  **Area:** `ui`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

At 1280x1000 on /this-does-not-exist, the fixed bottom-right friends dock pill sits on top of the 404 footer's right-hand text ('STRIKE · SPARK · SHARPEN'), which is visibly cut to 'S…' behind the pill (screenshot taken during audit). The dock hides on /race, /live, /sign-in per ui-law §17.5 but not on the 404/error surfaces whose own footer occupies the same corner.

## Affected code

- `src/app/not-found.tsx:98-105 (dock: src/components/friends-dock/index.tsx)`

## Evidence

At 1280x1000 on /this-does-not-exist, the fixed bottom-right friends dock pill sits on top of the 404 footer's right-hand text ('STRIKE · SPARK · SHARPEN'), which is visibly cut to 'S…' behind the pill (screenshot taken during audit). The dock hides on /race, /live, /sign-in per ui-law §17.5 but not on the 404/error surfaces whose own footer occupies the same corner. Same overlap pollutes /updates/<slug>, which §19 defines as a clean screenshot asset (the '2 LIVE' pill floats over the promo card area).

## Steps to reproduce

Signed out (dev dummy dock data active), open /this-does-not-exist at a desktop viewport; look at the bottom-right footer.

## Proposed fix

Hide the dock on the 404/error pages and /updates/* (extend the dock's hidden-route list), or pad the 404 footer right edge clear of the dock.

## Suggested labels

`severity:low` `area:ui` `ui`

---

_Found by: lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._
