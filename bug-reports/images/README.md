# Evidence images — deep scan `wf_a630179b-84b`

Screenshots captured by the Playwright browser-testing agents during the deep bug scan. Each image is the visual proof behind one or more reports in [`../INDEX.md`](../INDEX.md).

| Image | Supports report(s) | What it shows |
|-------|--------------------|----------------|
| `lines2-caret-bottom.png` | [FT-008](../FT-008-passage-lines-2.md) | Caret pinned to the bottom of two visible lines — no lookahead |
| `lines2-state.png` | [FT-008](../FT-008-passage-lines-2.md) | `linesRendered=2` clip box state |
| `bughunt-lines2-caret-last-line.png` | [FT-008](../FT-008-passage-lines-2.md) | Caret riding the last visible line mid-run |
| `bughunt-lines2-mid-typing.png` | [FT-008](../FT-008-passage-lines-2.md) | Two-line render while typing |
| `deadlock-strictspace-confidence.png` | [FT-015](../FT-015-confidence-strict-deadlock.md) | Strict-space + confidence-mode interaction deadlock |
| `deadlock-confidence-strictspace.png` | [FT-015](../FT-015-confidence-strict-deadlock.md) | Same deadlock, reverse toggle order |
| `errors-styling.png` | [FT-016](../FT-016-accuracy-never-drops.md), [FT-034](../FT-034-stop-on-error-word-flagged.md) | Mistake/error letter styling on the active word |
| `result-chart-hover.png` | [FT-006](../FT-006-results-chart-markers.md) | Results chart markers / hover state |
| `replay-running.jpg` | [FT-006](../FT-006-results-chart-markers.md) | Replay running on the results screen |
| `bughunt-tape-margin100.png` | [FT-071](../FT-071-tape-margin-caret.md) | Tape mode with margin=100 — caret position |
| `bughunt-tape-letter.png` | [FT-071](../FT-071-tape-margin-caret.md) | Tape (letter) mode caret rendering |
| `bughunt-block-caret.png` | [FT-071](../FT-071-tape-margin-caret.md) | Block caret style |
| `bughunt-maxwidth5.png` | [FT-056](../FT-056-lines-default-mismatch.md) | Max line width = 5 layout |
| `bughunt-quote-short.png` | [FT-027](../FT-027-mt-import-quote-length.md) | Short quote rendering |
| `mobile-nav-drawer.png` | [FT-025](../FT-025-drawer-dead-links.md), [FT-026](../FT-026-mobile-drawer-signout.md), [FT-058](../FT-058-mobilenav-aria-id.md) | Mobile nav drawer open |
| `home-375.png` | [FT-037](../FT-037-topbar-nav-clip.md), [FT-055](../FT-055-homepage-guest-copy.md) | Home page at 375 px |
| `leaderboard-375.png` | [FT-004](../FT-004-leaderboard-friends-starve.md) | Leaderboard at 375 px |
| `race-joined-signedout.png` | [FT-070](../FT-070-signedout-401-noise.md) | Race joined while signed out |
| `bughunt-customise-dark.png` | [FT-001](../FT-001-palette-destroyed.md), [FT-028](../FT-028-palette-fouc.md) | Customise page in dark mode |
| `bughunt-dark-catppuccin-home.png` | [FT-001](../FT-001-palette-destroyed.md), [FT-048](../FT-048-cmdpalette-default-palette.md) | Catppuccin palette on home |
| `behaviour-blind-preview.png` | [FT-034](../FT-034-stop-on-error-word-flagged.md) | Blind-mode behaviour preview |
| `behaviour-input-preview-blind.png` | [FT-034](../FT-034-stop-on-error-word-flagged.md) | Blind-mode input preview |
| `blind-mode-typing.png` | [FT-034](../FT-034-stop-on-error-word-flagged.md) | Blind-mode typing in progress |
| `behaviour-previews-blind-min8.png` | [FT-057](../FT-057-minwordlen-pool.md) | Min word length = 8 behaviour preview |

> Some screenshots support more than one report (e.g. the mobile-nav drawer is cited by three mobile-nav bugs). The mapping reflects the strongest association; consult each report's own **Evidence** section for the authoritative citation.
