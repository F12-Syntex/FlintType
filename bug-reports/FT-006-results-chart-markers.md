# FT-006 — Results chart paints mistake markers on every point of a 0-error run + duplicate-key 'wpm'

> **Severity:** HIGH  •  **Area:** `results`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

`<Scatter data={merged.filter((b) => b.errors > 0)} dataKey="wpm" shape={<ErrorMark/>}>` — when the run has zero errors the filter yields an empty array, and recharts treats an empty series `data` as 'fall back to the chart-level data', so the destructive ✕ ErrorMark renders at EVERY WPM bucket of a perfect run.

## Affected code

- `src/app/_components/result-chart.tsx:202-207`

## Evidence

`<Scatter data={merged.filter((b) => b.errors > 0)} dataKey="wpm" shape={<ErrorMark/>}>` — when the run has zero errors the filter yields an empty array, and recharts treats an empty series `data` as 'fall back to the chart-level data', so the destructive ✕ ErrorMark renders at EVERY WPM bucket of a perfect run. Observed live: a words-10 run with acc 100%, errors 0, ribbon 'no mistakes' showed red ✕ marks at 1s,2s,3s,5s,6s,7s (screenshot result-chart-hover.png). The same Scatter also re-registers dataKey 'wpm' (already used by the <Area> at line 183 — the comment at lines 178-181 says merging Area+Line fixed exactly this tooltip-lists-wpm-twice bug, #13), so hovering the chart shows the tooltip rows 'raw 83.5 / wpm 83.5 / sec 4 / wpm 83.5' (wpm twice plus a stray sec row) and the console logs: 'Encountered two children with the same key, `wpm`. Keys should be unique…' (fired twice per hover).

## Steps to reproduce

1. http://localhost:3000/ → complete a 10-word test with no mistakes.
2. Look at the chart: ✕ marks on every bucket despite 'no mistakes'.
3. Hover the chart: tooltip lists wpm twice + a 'sec' row; DevTools console shows the React duplicate-key error.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

Tried to refute it and could not — every claim checks out against the actual source. (1) Empty-data fallback is real: src/app/_components/result-chart.tsx:202-207 renders `<Scatter data={merged.filter((b) => b.errors > 0)} dataKey="wpm" shape={<ErrorMark/>}>` unconditionally, and the installed recharts 3.8.1 (node_modules/recharts/es6/state/selectors/scatterSelectors.js lines 26-30) uses the item's own data only when `data != null && data.length > 0`; otherwise it falls back to `chartData.slice(...)` — the chart-level `merged` array. On a zero-mistake run the filter yields `[]`, so the destructive ✕ ErrorMark is computed for EVERY bucket of the run, directly contradicting the "no mistakes" ribbon rendered below in the same component (ErrorRibbon). No upstream guard exists: test-summary.tsx:555 passes raw `state.events`, and a perfect run has no incorrect events. No test covers this (components are manual-test-only per ui-law §1.3). (2) Tooltip duplication is real: recharts Scatter (es6/cartesian/Scatter.js, computeScatterPoints lines 377-395) builds a per-point tooltipPayload with TWO entries — one for the xAxis dataKey ("sec") and one for the y dataKey, which resolves to the Scatter's own dataKey "wpm" since the YAxis declares none. The Area at line 183 already registers dataKey "wpm", so the shared axis tooltip payload contains "raw", "wpm", "sec", "wpm" — exactly the observed rows. (3) The React duplicate-key error is real: the shadcn ChartTooltipContent (src/components/ui/line-chart.tsx:212) keys tooltip rows with `key={item.dataKey}`, so two payload items with dataKey "wpm" fire "Encountered two children with the same key" on every hover. The code comment at lines 178-181 explicitly documents that bug #13 was this same tooltip-lists-wpm-twice failure, making the Scatter a genuine regression of a fixed bug class. Severity "high" is honest: every perfect run (a common, celebrated outcome) shows false error marks on the flagship results surface, and every chart hover misreports stats plus throws a console error. The suggested fix (conditional render + distinct series identity or tooltipType="none") is correct.

## Proposed fix

Render the Scatter conditionally: `{errorPoints.length > 0 && <Scatter data={errorPoints} … />}`; and give it a distinct series identity (e.g. `name="errors"` / a wrapper dataKey) so its tooltip entry can't collide with the Area's 'wpm' key, or exclude it from the tooltip entirely (tooltipType="none").

## Corroborating reports

Independently surfaced by 3 finder(s); this report merges them.

- **lane:practice+behaviour** — React duplicate-key error 'wpm' on every results chart render (Area + Scatter both keyed by dataKey 'wpm') (`C:/Users/synte/Programming/programming2/flinttype/src/app/_components/result-chart.tsx:182-207`)
- **lane:appearance+responsive** — Results screen: React 'two children with the same key, wpm' warning — Area and Scatter both keyed by dataKey 'wpm' (`src/app/_components/result-chart.tsx:183,204`)

## Suggested labels

`severity:high` `area:results`

---

_Found by: lane:appearance+responsive, lane:pages+race-flow, lane:practice+behaviour. Generated from scan run `wf_a630179b-84b`._
