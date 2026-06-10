# FT-014 — Command palette 'Go to test' navigates to /app, which is a 404

> **Severity:** MEDIUM  •  **Area:** `ui`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The Navigate-group entry { id: 'nav.app', label: 'Go to test', hint: 'Open the practice surface', run: navigate('/app') } points at /app, but the practice surface lives at /. Verified in the browser: http://localhost:3000/app renders the '404 — passage not found' page (page title '404 — passage not found · flinttype');

## Affected code

- `C:/Users/synte/Programming/programming2/flinttype/src/lib/command-palette/use-command-entries.ts:824`

## Evidence

The Navigate-group entry { id: 'nav.app', label: 'Go to test', hint: 'Open the practice surface', run: navigate('/app') } points at /app, but the practice surface lives at /. Verified in the browser: http://localhost:3000/app renders the '404 — passage not found' page (page title '404 — passage not found · flinttype'); the session console log recorded matching 'Failed to load resource: 404 @ http://localhost:3000/app' entries when the command was exercised. The most basic palette navigation command dead-ends the user on the 404 screen.

## Steps to reproduce

1) Press Ctrl+K anywhere.
2) Run 'Go to test'.
3) You land on /app, the 404 page.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Verified directly in code. src/lib/command-palette/use-command-entries.ts:818-826 defines the 'Go to test' Navigate entry with run: navigate("/app"), where navigate is a plain router.push (line 98) with no mapping. No /app route exists: src/app has no app/ directory (Glob src/app/app/**/page.tsx returns nothing); the practice surface is src/app/page.tsx at path "/". There is no redirect or rewrite anywhere — next.config.ts has none and src/proxy.ts (Clerk middleware) doesn't touch /app. The finder's browser observation is credible: src/app/not-found.tsx:6 sets the exact title '404 — passage not found' they reported. This is a stale leftover from a route flattening (/app/* → /*) — the sibling Navigate entries (nav.customise → /customise/appearance, nav.leaderboard → /leaderboard, nav.profile → /profile) all already use the flattened paths and resolve to real directories; only nav.app was missed. Severity medium is fair: a primary global-palette navigation command dead-ends users on the 404 page, but recovery is trivial. Suggested fix navigate("/") is correct.

## Proposed fix

Change the nav.app entry to navigate('/'). Audit other palette links for stale /app-prefixed routes.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **review:customise-prefs** — Command palette 'Go to test' navigates to /app, which is a 404 — the practice surface lives at / (`src/lib/command-palette/use-command-entries.ts:824`)

## Suggested labels

`severity:medium` `area:ui`

---

_Found by: lane:practice+behaviour, review:customise-prefs. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-014-cmdpalette-app-404.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-014-cmdpalette-app-404.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
