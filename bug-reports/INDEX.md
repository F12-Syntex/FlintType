# flinttype — Bug Report Index

Deep multi-agent bug scan, run `wf_a630179b-84b`, 2026-06-10.

**72 distinct bugs** (deduped from 102 raw / 98 post-merge findings across 18 finder agents + adversarial verification). Every High/Medium was confirmed by a 3-vote refuter panel; 0 findings were refuted. Lows are single-pass and may include cosmetic items.

| Severity | Count |
|---|---|
| **High** | 7 |
| **Medium** | 30 |
| **Low** | 35 |

Each report is a standalone, PR-ready document: summary, affected code, evidence, reproduction, root-cause/verification, proposed fix, and suggested labels. Ordered by severity. Open each as a GitHub issue, or attach as the PR description when you fix it.

## High (7)

| ID | Title | Area | Location | Confidence |
|----|-------|------|----------|------------|
| [FT-001](./FT-001-palette-destroyed.md) | Choosing a community palette then overriding any single setting silently destroys the palette on reload | `customise/theming` | `src/lib/theme-customization.ts:123-134` | 3/3 verifier votes |
| [FT-002](./FT-002-leaderboard-forgeable.md) | Global WPM leaderboard is fully forgeable — adapt.submit trusts unbounded client wpm/accuracy | `backend / leaderboard / adapt` | `src/types/adapt.ts:80; src/server/routes/adapt/submit.ts:140` | 3/3 verifier votes |
| [FT-003](./FT-003-race-keyboard-nav-dead.md) | Keyboard-only race lobby/results navigation is dead — Tab swallowed unconditionally | `race` | `src/app/_components/practice-state.tsx:1080-1105` | 3/3 verifier votes |
| [FT-004](./FT-004-leaderboard-friends-starve.md) | Leaderboard over-fetch dedupe can starve a user's friends board to zero entries | `backend` | `src/db/server/repositories/tests.ts:176-218` | 3/3 verifier votes |
| [FT-005](./FT-005-notif-bell-mobile.md) | Notifications bell is unreachable on mobile — topbar right slot hidden, no drawer entry | `ui` | `src/components/ft/top-bar.tsx:150` | 3/3 verifier votes |
| [FT-006](./FT-006-results-chart-markers.md) | Results chart paints mistake markers on every point of a 0-error run + duplicate-key 'wpm' | `results` | `src/app/_components/result-chart.tsx:202-207` | 3/3 verifier votes |
| [FT-007](./FT-007-prefs-lost-update.md) | user_prefs lost-update: client wholesale prefs.set silently reverts server-written slices | `db` | `src/lib/prefs-store.ts:243` | 3/3 verifier votes |

## Medium (30)

| ID | Title | Area | Location | Confidence |
|----|-------|------|----------|------------|
| [FT-008](./FT-008-passage-lines-2.md) | 'Lines rendered' = 2: caret rides the last visible line, so the upcoming line is never shown (no lookahead) | `practice/passage` | `src/app/_components/passage.tsx:517-521` | 1/1 verifier votes |
| [FT-009](./FT-009-reset-all-incomplete.md) | 'Reset all' does not reset everything it claims (Audio counted in the stat but not reset) | `customise` | `src/app/customise/behaviour/page.tsx:106-107` | 1/1 verifier votes |
| [FT-010](./FT-010-blog-links-404.md) | All three blog-index post links 404 — 'Coming soon' posts rendered as live links | `ui` | `src/app/blog/page.tsx:56-67` | 1/1 verifier votes |
| [FT-011](./FT-011-burst-final-autofinish.md) | BURST: the final item auto-finishes on its last character, bypassing the threshold/reps/space gate | `practice` | `src/app/_components/practice-reducer.ts:400` | 1/1 verifier votes |
| [FT-012](./FT-012-burst-space-bypass.md) | BURST: window-level Space handler bypasses the burst threshold/reps gate and double-dispatches | `practice` | `src/app/_components/practice-state.tsx:1029` | 1/1 verifier votes |
| [FT-013](./FT-013-prefs-pre-get-overwrite.md) | Changing any setting before the prefs GET resolves on a fresh device overwrites that slice with defaults | `prefs sync` | `src/lib/prefs-store.ts:160-162` | 1/1 verifier votes |
| [FT-014](./FT-014-cmdpalette-app-404.md) | Command palette 'Go to test' navigates to /app, which is a 404 | `ui` | `C:/Users/synte/Programming/programming2/flinttype/src/lib/co` | 1/1 verifier votes |
| [FT-015](./FT-015-confidence-strict-deadlock.md) | Confidence 'All' + Strict space deadlocks WORDS/QUOTE runs after one typo (only Esc escapes) | `practice` | `src/app/_components/input-capture.tsx:201` | 3/3 verifier votes |
| [FT-016](./FT-016-accuracy-never-drops.md) | Corrected and stop-on-error-blocked mistakes never lower accuracy (structurally 100% / 0 errors) | `practice` | `C:/Users/synte/Programming/programming2/flinttype/src/app/_c` | 3/3 verifier votes |
| [FT-017](./FT-017-prefs-cross-user-bleed.md) | Cross-user prefs bleed: the auth-blind prefs store survives sign-out and flushes into the next signed-in account | `backend` | `src/lib/prefs-store.ts:132-180` | 1/1 verifier votes |
| [FT-018](./FT-018-streak-dst.md) | Daily streak / activity-heatmap day math breaks across DST transitions (fixed 86,400,000 ms day step) | `stats` | `src/app/profile/_components/derive-stats.ts:133` | 1/1 verifier votes |
| [FT-019](./FT-019-discord-banner-autohide.md) | Discord promo banner ignores chrome auto-hide AND focus mode — stays clickable mid-run | `practice` | `src/app/_components/discord-banner.tsx:34` | 1/1 verifier votes |
| [FT-020](./FT-020-esc-restart-palette.md) | Escape outside the typing input both restarts the running test AND opens the command palette | `practice` | `C:/Users/synte/Programming/programming2/flinttype/src/app/_c` | 1/1 verifier votes |
| [FT-021](./FT-021-race-placement-double-penalty.md) | Final race placement double-penalizes accuracy (net WPM x accuracy), disagreeing with the WPM column | `race` | `src/server/race/room.ts:785-809` | 1/1 verifier votes |
| [FT-022](./FT-022-dock-ai-overlap.md) | Friends-dock pill overlaps the 'Design with AI' launcher at narrow widths on /customise | `customise` | `src/app/customise/_components/ai-dock.tsx:45` | 1/1 verifier votes |
| [FT-023](./FT-023-guest-pb-stale.md) | Guest PB cache stores the stale 1 Hz live WPM instead of the final WPM | `practice` | `src/app/_components/test-summary.tsx:472` | 3/3 verifier votes |
| [FT-024](./FT-024-race-no-watchdog.md) | Matchmaking word races have no max-duration watchdog — an AFK racer pins the room in 'racing' forever and leaks the bot tick | `race` | `src/server/race/room.ts:485-500,754-773,930-945` | 1/1 verifier votes |
| [FT-025](./FT-025-drawer-dead-links.md) | Mobile drawer STATUS and PRIVACY links are dead placeholder anchors | `ui` | `src/app/_components/app-drawer-extras.tsx:21-22` | 1/1 verifier votes |
| [FT-026](./FT-026-mobile-drawer-signout.md) | Mobile nav drawer shows SIGN OUT / PROFILE to signed-out users; no Sign in affordance | `ui` | `src/app/_components/app-drawer-extras.tsx:65 (and src/app/_c` | 3/3 verifier votes |
| [FT-027](./FT-027-mt-import-quote-length.md) | MonkeyType import in quote mode writes an invalid quote length, leaving QUOTE with no selectable length | `customise/import-export` | `src/lib/import-export.ts:533-547` | 1/1 verifier votes |
| [FT-028](./FT-028-palette-fouc.md) | Named community palettes flash the Default palette on every page load (FOUC) | `customise / theming` | `src/lib/themes/use-palette.tsx:70-120 (and src/lib/bootstrap` | 1/1 verifier votes |
| [FT-029](./FT-029-level-xp-forgeable.md) | Profile level / 'Top by Level' / public-profile stats are client-forgeable via prefs.set | `backend / leaderboard / profile / prefs` | `src/types/user-prefs.ts:15-33; src/server/routes/prefs/index` | 3/3 verifier votes |
| [FT-030](./FT-030-race-progress-unvalidated.md) | Race progress is unvalidated server-side — a single keystroke POST can jump to the finish and win | `race` | `src/types/race.ts:193` | 3/3 verifier votes |
| [FT-031](./FT-031-race-invite-never-read.md) | race_invite notification is never marked read on join — dock challenge + Swords badge persist forever pointing at dead lobbies | `social` | `src/components/friends-dock/dock-panel.tsx:146-161` | 1/1 verifier votes |
| [FT-032](./FT-032-share-og-mislabel.md) | Share page and OG image label every TIME/QUOTE run as 'Words - N' | `share` | `src/app/share/[slug]/_components/share-card.tsx:18-22` | 1/1 verifier votes |
| [FT-033](./FT-033-space-skip-completes.md) | Space-skipping every word 'completes' a test reporting 100% accuracy, 0 errors and 100% consistency | `practice` | `C:/Users/synte/Programming/programming2/flinttype/src/app/_c` | 1/1 verifier votes |
| [FT-034](./FT-034-stop-on-error-word-flagged.md) | Stop-on-error: a blocked wrong keystroke leaves a perfectly-typed word showing the red error underline for the rest of the run | `practice` | `src/app/_components/practice-reducer.ts:387` | 1/1 verifier votes |
| [FT-035](./FT-035-tab-restart-modal.md) | Tab restarts the test and steals focus while a modal dialog is open on the practice surface | `practice` | `C:/Users/synte/Programming/programming2/flinttype/src/app/_c` | 1/1 verifier votes |
| [FT-036](./FT-036-pb-bucket-conflation.md) | TIME-mode and WORDS-mode runs collapse to the same (mode, amount) PB/leaderboard bucket | `stats` | `src/app/_components/practice-state.tsx:587-597` | 1/1 verifier votes |
| [FT-037](./FT-037-topbar-nav-clip.md) | TopBar nav pill clips Leaderboard/Insights at 768-~900px with no hamburger fallback | `ui` | `src/components/ft/top-bar.tsx:104` | 3/3 verifier votes |

## Low (35)

| ID | Title | Area | Location | Confidence |
|----|-------|------|----------|------------|
| [FT-038](./FT-038-results-orphan-mock.md) | /results is an orphaned hardcoded design-mockup route presenting fabricated run data | `results` | `src/app/results/page.tsx` | 1/1 verifier votes |
| [FT-039](./FT-039-terms-orphan.md) | /terms is an orphan page — in the sitemap but linked from nowhere in the UI | `ui` | `src/app/terms/page.tsx (sitemap entry: src/app/sitemap.ts:65` | single-pass (unverified low) |
| [FT-040](./FT-040-404-mac-glyph.md) | 404 footer hardcodes the Mac command glyph for the command-palette hint on all platforms | `ui` | `src/app/not-found.tsx:101 (same pattern in src/app/error.tsx` | single-pass (unverified low) |
| [FT-041](./FT-041-pbcache-bleed.md) | Anonymous PB-crown cache (and BURST avg cache) bleeds across users on a shared browser; 'resets each session' comment is false | `stats` | `src/lib/pb-cache.ts:10-11` | single-pass (unverified low) |
| [FT-042](./FT-042-autohide-hover-peek.md) | Auto-hide 'hover to peek chrome back' is impossible under fade (the default) — pointer-events:none defeats :hover | `practice` | `src/app/globals.css:706-719` | 1/1 verifier votes |
| [FT-043](./FT-043-dead-quickrestart.md) | behaviour.quickRestart is a dead pref: no UI, no consumer, yet writable and inflates the customised count | `customise` | `src/lib/behaviour-prefs.ts:10` | 1/1 verifier votes |
| [FT-044](./FT-044-block-follow-race.md) | Block + concurrent follow race can leave a live follow edge across a block (presence leaks to the blocked party) | `social` | `src/server/routes/friends/index.ts:31-47` | single-pass (unverified low) |
| [FT-045](./FT-045-burst-results-label.md) | BURST results screen labels the run as 'words N' in TEST TYPE | `practice` | `src/app/_components/test-summary.tsx:499` | single-pass (unverified low) |
| [FT-046](./FT-046-burst-wordlist-reroll.md) | BURST: picking a new wordlist at rest does not re-roll the passage and Tab cannot apply it | `practice` | `src/app/_components/practice-state.tsx:267` | single-pass (unverified low) |
| [FT-047](./FT-047-changelog-raw-md.md) | Changelog renders raw markdown ('**Ready**') on /changelog and in the What's New dialog | `ui` | `public/CHANGELOG.md:159 (renderers: src/app/changelog/page.t` | single-pass (unverified low) |
| [FT-048](./FT-048-cmdpalette-default-palette.md) | Command palette 'Theme palette' enum cannot represent or select the Default palette (or Custom) | `command-palette/theming` | `src/lib/command-palette/use-command-entries.ts:135-144` | single-pass (unverified low) |
| [FT-049](./FT-049-discord-banner-flash.md) | DiscordBanner flashes in-then-out on every load for users who dismissed it — the described loading gate doesn't exist | `ui` | `src/app/_components/discord-banner.tsx:22-28` | single-pass (unverified low) |
| [FT-050](./FT-050-invite-silent-fail.md) | FollowButton 'Invite to a race' fails silently with no loading or error state | `ui` | `src/components/follow-button.tsx:99-108` | single-pass (unverified low) |
| [FT-051](./FT-051-friendpb-oneway.md) | friend_pb fan-out notifies ALL one-way followers with copy claiming 'A friend hit a personal best' | `backend` | `src/server/routes/adapt/submit.ts:204-227` | single-pass (unverified low) |
| [FT-052](./FT-052-dock-404-overlap.md) | Friends dock pill overlaps and occludes the 404 page footer text | `ui` | `src/app/not-found.tsx:98-105 (dock: src/components/friends-d` | single-pass (unverified low) |
| [FT-053](./FT-053-friends-compare-no-block.md) | friends.compare returns a target's head-to-head stats with no block check | `backend/friends` | `src/server/routes/friends/compare.ts:15` | single-pass (unverified low) |
| [FT-054](./FT-054-modal-no-focustrap.md) | Hand-rolled modal dialogs (ConfirmDialog, MobileSheet) declare aria-modal but have no focus trap / initial focus / focus restore | `ui` | `src/components/ui/confirm-dialog.tsx:113-119` | single-pass (unverified low) |
| [FT-055](./FT-055-homepage-guest-copy.md) | Homepage copy promises 'everything else works without an account' but Drills and Insights hard-redirect guests to /sign-in | `ui` | `src/app/page.tsx (About region copy) / observed at http://lo` | single-pass (unverified low) |
| [FT-056](./FT-056-lines-default-mismatch.md) | Lines-rendered control / AI catalog default (3) disagrees with the shipped linesRendered default (4) | `customise/ai + typing-area control` | `src/server/routes/appearance/options.ts:160` | single-pass (unverified low) |
| [FT-057](./FT-057-minwordlen-pool.md) | Minimum word length 7-8 collapses the word pool to 16/4 words — passages repeat the same few words | `behaviour` | `src/app/_components/practice-reducer.ts:126-137` | single-pass (unverified low) |
| [FT-058](./FT-058-mobilenav-aria-id.md) | MobileNav hamburger references aria-controls="mobile-nav-drawer" but the drawer has no matching id | `ui` | `src/components/ft/mobile-nav.tsx:163` | single-pass (unverified low) |
| [FT-059](./FT-059-nonexistent-profile-hero.md) | Nonexistent-user profile renders a zeroed fake profile hero instead of a not-found state | `ui` | `src/app/profile/[username] (observed at http://localhost:300` | single-pass (unverified low) |
| [FT-060](./FT-060-bootstrap-attr-drift.md) | Pre-hydration bootstrap attr defaults drifted from DEFAULT_APPEARANCE — untouched users get a chrome flash on every load | `customise/appearance` | `src/lib/bootstrap.ts:44-50` | single-pass (unverified low) |
| [FT-061](./FT-061-race-clock-skew.md) | Race countdown/elapsed readout mixes local Date.now() with server timestamps, breaking documented clock-skew immunity | `race` | `src/app/race/_components/race-online.tsx:271-284,553-561` | 1/1 verifier votes |
| [FT-062](./FT-062-race-mode-picker-renders-as-a-desktop-popover-.md) | Race mode picker renders as a desktop popover on mobile, violating the §10.5 bottom-sheet mandate | `race` | `src/app/race/_components/mode-picker.tsx:33-66` | single-pass (unverified low) |
| [FT-063](./FT-063-recharts-dim-warning.md) | Recharts width(-1)/height(-1) console warnings on /customise/appearance (cosmetic) | `customise` | `http://localhost:3000/customise/appearance (chart inside a c` | single-pass (unverified low) |
| [FT-064](./FT-064-resetall-confirm-copy.md) | Reset-all confirm dialog title is broken copy: 'Reset make it act the way you think?' | `customise` | `src/app/customise/_components/page-header.tsx:61` | single-pass (unverified low) |
| [FT-065](./FT-065-clerk-userlist-limit.md) | resolveUserDisplays passes an unbounded follow-list size as the Clerk getUserList limit — breaks past Clerk's 500 cap | `social` | `src/server/user-display.ts:137-140` | single-pass (unverified low) |
| [FT-066](./FT-066-heatmap-latency.md) | Results passage heatmap misattributes per-letter latencies after a skipped word / backspace-retype / uncorrected error | `practice` | `src/app/_components/test-summary.tsx:181` | 1/1 verifier votes |
| [FT-067](./FT-067-scrolltotop-noop.md) | ScrollToTop is a no-op: it scrolls window, but AppChrome's inner div is the actual scroller | `ui` | `src/app/_components/scroll-to-top.tsx:12` | single-pass (unverified low) |
| [FT-068](./FT-068-export-omits-audio.md) | Settings export/import omits the 'audio' slice (and 'handLayout') — JSON round-trip drops click-sound settings | `customise/import-export` | `src/lib/import-export.ts:15-24` | 1/1 verifier votes |
| [FT-069](./FT-069-sharecard-arrow.md) | Share card CTA label uses a trailing arrow glyph ('Take the test ->') banned by the project's UI law | `share` | `src/app/share/[slug]/_components/share-card.tsx:127` | single-pass (unverified low) |
| [FT-070](./FT-070-signedout-401-noise.md) | Signed-out visitors fire guaranteed-401 API calls on every page load / pref change / completed run (console error noise) | `practice` | `C:/Users/synte/Programming/programming2/flinttype/src/app/_c` | single-pass (unverified low) |
| [FT-071](./FT-071-tape-margin-caret.md) | Tape margin slider allows values that pin the caret in the right fade band (next char invisible / unplayable) | `practice` | `src/lib/tape-fade.ts:18` | single-pass (unverified low) |
| [FT-072](./FT-072-timemode-refill-config.md) | TIME-mode end-of-buffer refill ignores the user's wordlist / min-length / word-shape prefs | `practice` | `src/app/_components/practice-reducer.ts:517` | single-pass (unverified low) |
