# FT-037 — TopBar nav pill clips Leaderboard/Insights at 768-~900px with no hamburger fallback

> **Severity:** MEDIUM  •  **Area:** `ui`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The nav pill has `overflow-hidden` ("inline-flex items-center gap-0.5 overflow-hidden rounded-md border p-0.5"). Measured at 768x1024: nav scrollWidth=380 vs clientWidth=274–285, so 'Leaderboard' renders cut mid-word ('Leaderboa') and 'Insights' is fully clipped — both links exist in the DOM (rects extend to x=584, container right edge 482) but are unreachable.

## Affected code

- `src/components/ft/top-bar.tsx:104`

## Evidence

The nav pill has `overflow-hidden` ("inline-flex items-center gap-0.5 overflow-hidden rounded-md border p-0.5"). Measured at 768x1024: nav scrollWidth=380 vs clientWidth=274–285, so 'Leaderboard' renders cut mid-word ('Leaderboa') and 'Insights' is fully clipped — both links exist in the DOM (rects extend to x=584, container right edge 482) but are unreachable. Clipping persists through 850px (clientWidth 356) and only resolves at ~900px. The mobile hamburger is md:hidden, so at 768–899px there is NO route to Leaderboard or Insights from the top chrome (the footer also lacks those links).

<!-- evidence-embedded -->

**Captured screenshots:**

![Home page at 375 px](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/home-375.png)

*Home page at 375 px.*

## Steps to reproduce

Resize browser to 768x1024 (or any width 768–899), load http://localhost:3000/ — observe the nav pill shows 'Practice Drills Races Leaderboa' with Leaderboard cut and Insights missing; no scroll affordance, no hamburger.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

Code fully corroborates the browser measurement. In src/components/ft/top-bar.tsx: the nav wrapper (line 95) is 'hidden min-w-0 md:flex' — min-w-0 lets the grid 1fr column shrink it below content width — and the nav (line 104) is 'inline-flex ... overflow-hidden', so as a flex item its min-width:auto resolves to 0 and trailing links clip silently (no wrap, no scroll). The hamburger in mobile-nav.tsx (line 165) is md:hidden, so at 768–~900px both the inline nav's tail AND the drawer route are gone simultaneously. AppChrome's five labels (Practice/Drills/Races/Leaderboard/Insights, app-chrome.tsx:9-15) at 13px JetBrains Mono + px-3 padding make ~380px nav width credible, while at 768px the logo column, right cluster (TopbarActions is also md:flex, consuming width), gaps and padding leave ~275-320px — matching the measured clientWidth. app-footer.tsx has no Leaderboard/Insights links. No CSS guard exists for [data-ft-topbar-pill] beyond the text-only flattening, and per ui-law §1.3/§10.3 components have no automated tests and the manual gate only covers 375px and ≥1024px — exactly missing this band. Severity corrected from high to medium: the failure is confined to portrait-tablet widths (though that includes every iPad in portrait: 768/810/820/834px), only two of five nav destinations are affected, the pages remain reachable via direct URL / the Cmd+K palette's Navigate entries / rotating to landscape (1024px lays out fine) — so 'no way to reach them' is slightly overstated, but no discoverable visible affordance exists and the mid-word clipping reads as visibly broken.

## Proposed fix

Either keep the hamburger visible until the full nav fits (swap the md: breakpoint for lg:), drop nav labels/padding at md, or let the pill wrap/scroll instead of overflow-hidden clipping.

## Suggested labels

`severity:medium` `area:ui` `ui`

---

_Found by: lane:appearance+responsive. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-037-topbar-nav-clip.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-037-topbar-nav-clip.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
