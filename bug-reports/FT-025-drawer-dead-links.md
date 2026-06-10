# FT-025 — Mobile drawer STATUS and PRIVACY links are dead placeholder anchors

> **Severity:** MEDIUM  •  **Area:** `ui`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

META links are hardcoded `{ href: "#status", label: "STATUS" }, { href: "#privacy", label: "PRIVACY" }`. Neither anchor exists on any page — clicking them does nothing. The real privacy page exists at /privacy (the desktop footer links it correctly); there is no status page at all.

## Affected code

- `src/app/_components/app-drawer-extras.tsx:21-22`

## Evidence

META links are hardcoded `{ href: "#status", label: "STATUS" }, { href: "#privacy", label: "PRIVACY" }`. Neither anchor exists on any page — clicking them does nothing. The real privacy page exists at /privacy (the desktop footer links it correctly); there is no status page at all.

## Steps to reproduce

375px viewport, open the hamburger drawer, tap STATUS or PRIVACY — URL gains #status/#privacy and nothing happens.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Verified by reading the source. src/app/_components/app-drawer-extras.tsx:21-22 hardcodes href="#status" and href="#privacy" in the META links, rendered as internal <Link> elements (not external, so no special handling). A repo-wide grep finds no element with id="status" or id="privacy" anywhere in src/, so clicking only appends the hash to the URL with no effect. A real privacy page exists at src/app/privacy/page.tsx and the desktop footer (app-footer.tsx:53) links it correctly as /privacy, proving the drawer entry is a stale placeholder; no /status route exists at all. The component is genuinely reachable: AppDrawerExtras is mounted as drawerExtras in app-chrome.tsx:51, which feeds the mobile hamburger drawer, matching the 375px repro. No guard, redirect, or test contradicts the finding. Severity medium is fair: PRIVACY is a link real users (and compliance checks) tap, and the working destination is unreachable from mobile nav. Suggested fix is correct.

## Proposed fix

Point PRIVACY at /privacy; remove STATUS (no status page exists) or point it at a real destination.

## Corroborating reports

Independently surfaced by 3 finder(s); this report merges them.

- **review:ui-misc** — Mobile drawer STATUS and PRIVACY links are dead hash anchors; PRIVACY should point at the existing /privacy route (`src/app/_components/app-drawer-extras.tsx:21-22`)
- **lane:appearance+responsive** — Drawer STATUS and PRIVACY links are dead placeholder anchors (#status / #privacy) (`src/app/_components/app-drawer-extras.tsx:21-22`)

## Suggested labels

`severity:medium` `area:ui` `ui`

---

_Found by: lane:appearance+responsive, lane:pages+race-flow, review:ui-misc. Generated from scan run `wf_a630179b-84b`._
