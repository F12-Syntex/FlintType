# Bug reports — deep scan `wf_a630179b-84b` (2026-06-10)

This folder holds **72 standalone, PR-ready bug reports**, one per distinct bug, produced by a deep multi-agent audit of the flinttype codebase. Start at [`INDEX.md`](./INDEX.md) — every bug is listed there, grouped by severity, linking to its report.

## What each report contains

Each `FT-NNN-*.md` is written to drop straight into a GitHub issue or a PR description:

- **Summary** — the bug in a paragraph.
- **Affected code** — the exact files and line ranges.
- **Evidence** — the finder's concrete proof (code paths, live-browser observations, reproduced API responses).
- **Steps to reproduce** — a deterministic path to the failure.
- **Root cause & verification** — for High/Medium bugs, the reasoning from the adversarial verifier panel that confirmed it.
- **Proposed fix** — a concrete, minimal direction (not yet applied).
- **Corroborating reports** — when several finders hit the same bug, they're merged and listed.
- **Suggested labels** — severity / area / security / data-loss / accessibility / ui / multiplayer.

## How they were produced

- **18 finder agents** — 7 static code reviewers (practice core, customise/prefs, race, backend routes, db/social, stats/progression, UI), 1 live API prober, and 6 Playwright browser testers driving the running app (practice torture, behaviour settings, appearance/typing-area, responsive sweep at 375/768/1280/1440 px, pages/nav, race/drills/results).
- **Adversarial verification** — every High and Medium finding was put to a 3-vote refuter panel (refute / trace / impact lenses); only majority-confirmed findings were kept. **0 findings were refuted.** Severities were re-graded by the panel where the finder over- or under-stated impact.
- **Dedup + merge** — 102 raw findings → deduped and merged into 72 distinct bugs.

## Caveats

- **Find-and-report only — no application code was changed.** The proposed fixes are directions, not patches.
- **Lows are single-pass** (not panel-verified) and include a few cosmetic items explicitly out of scope per `CLAUDE.md` (e.g. the recharts dimension warning) — flagged in their reports.
- **Signed-in flows were partially blind** — the app ran in Clerk keyless dev with no credentials, so drill completion, real friend/notification interactions, and authed race lobbies were covered by static review + API probing rather than full browser drive-through.
