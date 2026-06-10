# FT-063 — Recharts width(-1)/height(-1) console warnings on /customise/appearance (cosmetic)

> **Severity:** LOW  •  **Area:** `customise`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Console on /customise/appearance logs twice: 'The width(-1) and height(-1) of chart should be greater than 0, please check the style of container, or the props width(99%) and height(100%)…'. A ResponsiveContainer-based chart (section preview, likely the Live stats / Result preview) mounts inside a container measured at 0/-1 size before/while collapsed.

## Affected code

- `http://localhost:3000/customise/appearance (chart inside a collapsed/zero-size preview container)`

## Evidence

Console on /customise/appearance logs twice: 'The width(-1) and height(-1) of chart should be greater than 0, please check the style of container, or the props width(99%) and height(100%)…'. A ResponsiveContainer-based chart (section preview, likely the Live stats / Result preview) mounts inside a container measured at 0/-1 size before/while collapsed.

## Steps to reproduce

Open /customise/appearance with the console open; warnings appear during initial render.

## Proposed fix

Mount the chart only when its preview card is open/measured, or give the wrapper a min-height so the first measure isn't -1.

## Suggested labels

`severity:low` `area:customise`

---

_Found by: lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._
