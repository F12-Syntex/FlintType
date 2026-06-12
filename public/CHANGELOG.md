# Changelog

User-facing changes to flinttype, newest first — one section per version. Also served raw at `/changelog.md`; the `/changelog` page renders it.

- Write each line in plain language: what the user now **sees** or **can do**. No jargon, no file / function / symbol names.
- Versions whose changes don't concern the user (refactors, tests, tooling, internal fixes) get a single brief line, e.g. `- Internal changes only.`
- Updated on every version bump — see `CLAUDE.md` → **Commit discipline**.

---

## 6.136.6 — 12 June 2026
- You can now skip the very first word with space, just like any other word — pressing space before typing starts the test and moves on. Strict space still blocks skipping everywhere.
- Skipped words now count toward the errors stat on the results screen, matching the red underline you saw during the test.

## 6.136.0 — 8 June 2026
- The mode bar above the typing area is now always the chips picker — the "Mode bar" style choice (chips / inline / hidden) has been removed from Customise → Appearance → Chrome.
- The leaderboard now ranks only two modes: Casual and Adapt. The "All modes" and "Race" filters are gone, so the board compares like-for-like solo runs.
- Tidied the leaderboard layout on desktop: the top of the rankings panel now lines up flush with the top of the filter sidebar.

## 6.135.1 — 8 June 2026
- Trimmed the results screen: the "peak" and "avg" stats are gone, leaving a cleaner row of raw, stall, consistency, errors and time. The ✕ marks on the result graph remain only where you actually made a mistake.

## 6.135.0 — 3 June 2026
- The host can now force-start a rematch too. After a race finishes, if some players haven't pressed Rematch yet, the host gets a "Force rematch" button to start the next round anyway — same as the "Force start now" button in the opening lobby.
- Made races fully playable without a mouse. You can now Tab to the Ready, Start, Force-start, Rematch, and Leave buttons in the lobby and on the results screen, with a clear focus outline showing where you are. Tab is still held back mid-race so it can't pull you off the passage while you're typing.

## 6.134.1 — 2 June 2026
- Made adaptive mode actually adaptive: it now serves the words you're genuinely worst at instead of feeling too easy. Previously your hardest words were quietly filtered out for being "too difficult", and the rest were picked too evenly — now your weakest words clearly dominate each test.

## 6.134.0 — 1 June 2026
- Redesigned the race line-up again, this time TypeRacer-style: every racer now gets their own lane, with their name on the left, their flint stone gliding along its own track toward the finish, and their speed on the right. Much easier to follow who's where than the single shared line.
- In a lobby, each player's lane shows a clear checkbox — ticked once they've readied up, empty when they haven't — so at a glance you can see exactly who you're waiting on. The lobby card below now just holds the share link and Start button.

## 6.133.1 — 30 May 2026
- Fixed test replays drifting out of sync on longer runs (especially timed one-minute tests): the replay now highlights exactly the words you typed as it plays, so the trail tracks the timeline instead of lagging behind whenever a word was left incomplete or mistyped.

## 6.133.0 — 30 May 2026
- Redesigned the live race: everyone now races on a single shared line, each player a flint stone gliding toward the finish, with a compact name + speed legend underneath. A full lobby stays compact instead of stacking a tall lane per player.
- The "Ready up" button in a lobby is now a clear, prominent button so you can't miss it.
- The host's "Force start now" button is easier to see while waiting on players to ready up.

## 6.132.0 — 30 May 2026
- You can now force-start a private race lobby. When some players haven't readied up, the host gets a "Force start now" button to begin anyway, instead of waiting on everyone.

## 6.131.1 — 30 May 2026
- Fixed the race screen squeezing the passage off-screen when several people joined: the racer list is now more compact, and it no longer reserves a matching empty band at the bottom, so the text you type stays visible without zooming out.

## 6.131.0 — 30 May 2026
- "Design with AI" is now a dedicated page. The bar on the customise pages is just a launcher; pressing it opens a studio that previews your described look across six parts of the app (typing, live stats, keyboard, result, race, buttons) at once. Changes there only affect the previews, never your real settings, until you hit "Apply to settings".

## 6.130.1 — 30 May 2026
- Fixed the AI panel (and other pop-up surfaces) showing up dark on a light page after the AI applied a theme: applying a surface now updates the pop-up colours too, and the AI panel follows your theme directly.

## 6.130.0 — 30 May 2026
- The "Design with AI" panel is now a proper chat that remembers your conversation (it's no longer wiped when you close and reopen it, with a Clear button when you want a fresh start). It's been stripped back to a clean, borderless look that reads correctly in both light and dark mode, and when you send a message your text turns into a chat bubble with an animated "working" indicator instead of just disappearing.

## 6.129.1 — 30 May 2026
- Removed the helper blurb from the "Design with AI" panel; it opens straight to the input.

## 6.129.0 — 30 May 2026
- "Design with AI" is more reliable. Instead of inventing colours and values, it now picks from a fixed set of options we curate (accent colours, surface themes, fonts, sizes, and every behaviour toggle), so results are always valid and on-brand. It can also confidently change lots of things at once: ask for "a cosy warm dark theme, big serif, forgiving" and it sets the surface, accent, font, size, and behaviour in a single go.

## 6.128.4 — 30 May 2026
- Settings are flatter: the boxes around each option are gone. Rows are just a label and its controls, and the only outline left is the coral highlight on the option you've selected.

## 6.128.3 — 30 May 2026
- "Design with AI" fails far less often. The request now gives the model more room to answer, falls back to other models if one stalls, retries a blank reply, and tolerates extra formatting around the result, so the "AI service returned no content" error should be rare.

## 6.128.2 — 30 May 2026
- Settings rows no longer sit in a grey band; each row is now a clean outline on the page, and the option buttons themselves carry the surface, so the controls are clearly the thing you click.

## 6.128.1 — 30 May 2026
- The leaderboard now opens on the 60-second time test by default.
- Insights: removed the dashes from the copy, and simplified the heading.
- The customise and leaderboard pages no longer wrap their content in a panel that looked like the sidebar; the content now sits flush on the page.

## 6.128.0 — 30 May 2026
- "Design with AI" is now a small dock pinned to the bottom of the customise pages (Appearance and Behaviour). Open it, describe a change in plain words, and it applies live so you see it on the page right away. Keep chatting to make more changes; it lists exactly what it changed each time. Hit "Apply changes" to keep them, or "Undo" to roll the whole session back. It can now change how the test behaves too (stop-on-error, strict space, confidence, and so on), not just the look.
- Moved the on-screen keyboard and the friends dock lower so they sit closer to the bottom edge.

## 6.127.2 — 30 May 2026
- Removed the "Design with AI" card from the top of the Appearance settings page so the page is one consistent list of sections.

## 6.127.1 — 30 May 2026
- The "Design with AI" input now spans the full width, so your prompt no longer wraps to a second line when there's plenty of room.

## 6.127.0 — 30 May 2026
- Cleaner "Design with AI": a simple prompt box with a send button (no clutter). Keep typing to refine — each message builds on the last, so you can say "warmer", then "bigger caret", then "match the accent" and watch the preview stack the changes. When you're happy, hit "Apply changes" to save it, or "Reset" to start over.

## 6.126.0 — 30 May 2026
- "Design with AI" is smarter. It now knows your current look, so you can talk in relative terms ("warmer", "a bit bigger", "make it match the accent") and it adjusts from where you are. Ask for "a matching palette" or "colours that go together" and it builds a coordinated set; ask to "surprise me" or "randomise the accent" and it rolls tasteful random values. Faster too, since it only computes what changes.

## 6.125.1 — 30 May 2026
- Simplified the "Design with AI" page: the chat panel is gone. It's now a minimal AI bar above a full, native preview of your real typing screen — same fonts and sizes as the actual app. Type a look, see it exactly as it'll appear, then accept or discard.

## 6.125.0 — 30 May 2026
- "Design with AI" now has its own page (Customise → Appearance → Design with AI). Chat to describe the look you want and watch it render on a full preview of the real typing screen — top bar, live stats, passage, and keyboard, all fitting on screen with no scrolling. The proposed look only shows in the preview, so the chat and the rest of the app stay readable until you accept it. Accept to apply, or discard and try another.

## 6.124.1 — 30 May 2026
- Removed the always-on live preview from the Appearance settings page. Each setting keeps its own per-section preview as before, and the "describe the look" AI helper stays.

## 6.124.0 — 29 May 2026
- New on the Appearance settings page: describe the look you want in plain words ("light green background, big serif, soft corners") and flinttype turns it into real settings, previewing the change live on the page so you can see it before deciding. Accept to keep it, or discard to put everything back exactly as it was. Needs you to be signed in.

## 6.122.3 — 29 May 2026
- Internal changes only (developer tooling — an emulated multi-user simulation that drives four signed-in users through practice, following each other, and a private-lobby race, for end-to-end testing).

## 6.122.2 — 29 May 2026
- Updated the Discord invite link (the old invite is replaced); the "Join Discord" buttons and banners now point to the new server invite.

## 6.122.1 — 29 May 2026
- Added a shareable "what's new" card for the multiplayer race update (a private promo page you can screenshot), showing the flint-stone racetrack and the fire progression. Not an in-app change.

## 6.122.0 — 29 May 2026
- The multiplayer race now looks like an actual race: bigger lanes, and every racer is a flint stone that rolls toward the finish line as they type. The faster someone is going, the more their stone catches fire (a plain pebble at the bottom, a full inferno at the top), so you can see at a glance who's burning. You're the coral-glowing stone.

## 6.121.7 — 29 May 2026
- Internal changes only (developer tooling — Playwright Test Agents + browser MCP for automated test authoring).

## 6.121.6 — 29 May 2026
- Internal: the race lobby share-link "Copy" buttons now share one copy-to-clipboard helper instead of duplicating the logic. No behaviour change.

## 6.121.5 — 29 May 2026
- After a race ends, the passage you typed stays on screen above the results instead of vanishing.
- The race result headline now just states your place plainly ("1st place", "2nd place", …) instead of vague phrases like "Last across", with a one-line "Nth of N in m:ss" under it.

## 6.121.4 — 29 May 2026
- Added breathing room between the race player-list card and the text below it (the passage you type, and the spectator view), so the text no longer crowds the card.

## 6.121.3 — 29 May 2026
- Fixed the race typing text getting clipped under the player-list card. The text now sits at the vertical centre of the screen AND fully below the racetrack, so the first line is never hidden.

## 6.121.2 — 29 May 2026
- During a race the typing text now sits at the vertical centre of the screen again. The racetrack floats at the top instead of pushing the text down into the gap above the footer.

## 6.121.1 — 29 May 2026
- Relative timestamps now read consistently everywhere (recent runs, notifications, insights, your profile): "5m ago", "2h ago", then a tidy "May 4" for older entries. Internal: the duration and "time ago" formatters are now shared instead of re-written per page.

## 6.121.0 — 29 May 2026
- The results graph now marks your mistakes: a small red ✕ sits on the WPM line at each second you mistyped, so you can see where on the run your speed dipped against an error.

## 6.120.1 — 29 May 2026
- Pressing Tab during a multiplayer race no longer resets your run. Tab restarts only apply to solo practice; in a race it does nothing (rematch is the "Race again" button on the results panel).

## 6.120.0 — 29 May 2026
- The multiplayer race screen now reads like a racetrack. Everyone's progress shows as a row of lanes ABOVE the passage, each racer a marker that slides toward the finish line as they type (you're the coral one).
- Once you're in a lobby or race, the crowded mode / action chips are gone. A single "Leave race" button takes you out and back to the race menu.

## 6.119.0 — 29 May 2026
- Creating a race lobby is now one click. "Create lobby" makes the lobby straight away and drops you into it, instead of opening a setup panel first.
- Next to it is a settings button (the sliders icon) that lets you change what the lobby races. New lobbies default to quotes of mixed length (short through long). In there you can switch between Quote, Words, and Timed races, choose which quote lengths to draw from, or pick a word list and length as before. Your choice is remembered for next time.

## 6.118.3 — 29 May 2026
- Tidied the top bar: the "Sign in" button is now the same height as the bell, settings, and profile controls beside it, so the row lines up instead of the Sign in pill sitting noticeably shorter.

## 6.118.2 — 29 May 2026
- Both Start buttons in a race lobby (the header action and the lobby card) now wait for everyone to ready up — neither lets the host start early.

## 6.118.1 — 29 May 2026
- Plainer copy in a couple of spots: the Drills page now reads "Drill your weak spots · Short, focused sets on the letter pairs and words you're slowest at", and the race-finished line just states your placement and time ("Won in 0:24. Race again to defend it.") instead of the wordier version.

## 6.118.0 — 29 May 2026
- Race lobbies now have a ready-up step. Each player presses **Ready**, the lobby shows who's set, and the host can only start once everyone's ready (bots are always ready). The host's Start button waits — "Waiting for everyone to ready up · 1/2" — until the whole lobby is good to go, so a race can't begin before you're set.

## 6.117.9 — 29 May 2026
- Multiplayer: signed-in racers now show their real handle instead of "Guest". (The race server wasn't being told who you were on the hosted setup.)
- Multiplayer: you can no longer keep typing into the passage after a race has finished — input locks the instant the race ends, and the instant you personally cross the line.

## 6.117.8 — 29 May 2026
- Fixed the "new personal best" note so the "+N" improvement always matches the numbers shown — e.g. a 160 beating a previous 156 now reads +4, not +5.
- Fixed the results graph tooltip listing "wpm" twice; it now shows wpm and raw once each.

## 6.117.7 — 29 May 2026
- Multiplayer race results now show one consistent set of numbers. Your headline net WPM, your row in the standings, and the live race all read the same server-measured values, so they no longer disagree (the "66 here, 64 there" bug). The "raw" column now shows a true raw WPM (every key pressed) instead of repeating the net figure, and the ranking no longer penalises accuracy twice.

## 6.117.6 — 29 May 2026
- The error count shown while you type now matches the one on the results screen. Both count individual mistyped characters — previously the live counter counted whole words while the results counted keystrokes, so the two disagreed.
- Correcting a mistake with Backspace now clears its red mark, the same as Ctrl+Backspace already did. A fully-corrected run reads zero errors, matching its 100% accuracy.
- The results "errors over time" strip is now labelled "mistakes over time", to set the timeline of every keypress slip apart from the final error total.

## 6.117.5 — 29 May 2026
- Fixed leaderboard rows on mobile dropping the @handle when a player had wide tags (e.g. WHITE HAT + OG). The name now sits on its own line above the tags on phones, so it's always visible.

## 6.117.4 — 29 May 2026
- Fixed quote mode getting stuck on "loading quote…" after a page reload. If quote was your last-used mode, the passage now loads straight away instead of hanging.

## 6.117.3 — 29 May 2026
- Replaying a timed test now shows only the words you actually typed, instead of the entire long buffer of upcoming words that scrolls ahead during the run.

## 6.117.2 — 29 May 2026
- The friends panel now lists everyone you follow — including people who are offline — each with their last-seen status, instead of hiding them until you searched. Live and online friends still sort to the top, all in one scrollable list.

## 6.117.1 — 29 May 2026
- Edit profile no longer wipes a name or username you'd started typing the moment you pick a rank or toggle a tag — your in-progress text now stays put.
- Edit profile's Save button is no longer stuck disabled when you've only changed your rank or tags: those already save the instant you click them, and Save now reliably commits any name/username edit and closes the dialog.

## 6.117.0 — 25 May 2026
- Adaptive practice now zeroes in on the hand motions you're actually slow at, rather than a handful of specific words — so the speed you build carries over to everything you type. Each passage also spreads across several of your weak motions instead of repeating the same word over and over, and a word you've just drilled won't keep resurfacing for a good while.
- New "Isolation drill" cards on the Drills page: pick one of your weakest letter pairs and drill it across dozens of varied everyday words. Same motion, many words — the keybr-style way to make the speed actually transfer.

## 6.116.1 — 25 May 2026
- Nudged the friends bubble in the bottom-right corner so its gap above the footer now matches the on-screen keyboard's, lining the two up neatly.

## 6.116.0 — 25 May 2026
- Removed the side preview rail and gave every setting its own preview card again — a real, live render of that exact setting (built from the actual typing screen), so you see precisely how your choice looks, including the Colours section. Each card has a "Preview" toggle in its heading so you can fold the ones you've settled and keep the page as short as you like; your choices are remembered per section.

## 6.115.0 — 25 May 2026
- Brought back a real, live preview of your actual typing screen — now as one panel pinned beside the settings (a rail on the right on desktop, a strip at the top on mobile). It's built from the real practice screen — the passage, live stats, and keyboard — so the moment you change any look-and-feel option, it updates to show exactly how your typing screen will render.
- With the live preview doing the heavy lifting, the little samples on each option are back to compact hints, so the settings list stays short and scannable instead of stretching down the page.

## 6.114.0 — 25 May 2026
- Made the per-option setting previews far more literal: instead of small abstract swatches, each option now shows a tiny real mockup of the result — Card surfaces render an actual card with text, Topbar/Footer/Mode bar show a mini app frame, Dividers show two text blocks with the rule between them, Auto-hide fades a real toolbar, Live stats show the "42 98%" ticker in its panel, and the typing toggles (stop on error, extras, strict space, blind) show the words exactly as you'd type them. You can now tell at a glance how each choice will look.

## 6.113.1 — 25 May 2026
- Fixed a crash ("Cannot read properties of undefined") that could fire on page load when the account menu initialised before the sign-in client was ready.

## 6.113.0 — 25 May 2026
- Every visual setting now shows a tiny live sample right on its option chips, so you can pick by sight instead of by guessing what a label means. Surface, Chrome, Live stats, Result, Keymap, Background, Multiplayer and the Behaviour toggles (stop on error, confidence, extras, strict space, blind mode, minimum word length, secondary characters, keypress click) all carry these samples now. Options where a picture can't honestly show the effect (animation speeds, sliders, font names) keep their clear text labels.

## 6.112.0 — 25 May 2026
- Redesigned the Customise pages so each setting reads as its own distinct surface. The control rows now sit on a slightly recessed shade against the page and sidebar, so options like Theme and Mode stand out instead of blending into one flat sheet.
- Removed the large live-preview block that sat above every settings section. The controls are the focus now, and you see every change land for real on the typing screen.

## 6.111.7 — 25 May 2026
- Fixed the live WPM counter briefly showing a wild number (like 6000) in the first second of a test. It now settles into a sensible reading from the very start.
- Fixed timed tests (60s, 120s) running out of visible words for fast typists. Previously, once you reached a certain point the passage looked empty and the next words only appeared as you typed; now there's always a deep run of upcoming words ahead of your cursor.

## 6.111.6 — 25 May 2026
- The OG tag is now closed to flinttype's first 20 members. Everyone who already has it keeps it; new sign-ups no longer receive it.

## 6.111.5 — 23 May 2026
- Burst mode is now strict: the instant you mistype a letter, the word resets so you re-attempt it from scratch (it no longer waits until you press space). And pressing Tab now resets the current word to retry it, instead of starting a whole new set of words. (Esc still starts a fresh set.)

## 6.111.4 — 23 May 2026
- Corrected the sidebar/content surface colour: the settings and leaderboard sidebars and their content area now use the same card surface that sits behind the top nav and the theme/mode switcher, so everything reads as one consistent surface (the previous attempt matched them to the page background instead).

## 6.111.3 — 23 May 2026
- The settings and leaderboard sidebars and their content area now share the same background as the rest of the page, in both light and dark mode, instead of the content area being a slightly lighter shade on light themes.
- The ERR live stat now matches the size of WPM / ACC / BURST instead of always rendering larger (it stood out when the other stats were set to the smaller "mini" style).

## 6.111.2 — 23 May 2026
- Tape mode scrolling is now a smooth, steady glide instead of a fast, juddery snap. The text slides under the caret at a constant speed (and the caret tracks it in lockstep), so fast typing reads as continuous motion rather than a series of instant jumps.

## 6.111.1 — 23 May 2026
- Made hover highlights consistent across the app and fixed weak ones in light mode. Several surfaces (race lobby, profile, leaderboard rows, sidebars) used a washed-out, half-strength tint that was nearly invisible on a light background; they now all use the same theme-aware highlight that darkens on light themes and lifts on dark ones.

## 6.111.0 — 23 May 2026
- Fixed the theme system so "Default" is a real default again. The orange accent used to be force-applied as a hidden custom override, which meant a fresh setup always read as "Custom", the Primary accent colour always showed a "Reset" that never actually did anything, and you could never get back to a clean default. Now the orange is the genuine Default theme: the picker reads "Default", the Primary accent has no stray Reset until you actually change it, and resetting a colour (or the whole theme) truly returns it to default.
- Switching between themes and back to Default now reliably changes and restores colours.
- Existing setups are migrated automatically off the old state — your look is unchanged.

## 6.110.0 — 23 May 2026
- Race results are now live while the race is still on. When you cross the line before your opponents, your panel shows a provisional standing ("you're 2nd of 3 on net WPM, 1 racer still typing") and the rankings re-settle as each racer finishes, instead of prematurely declaring a win.
- Fixed: finishing first no longer shows "Race won" when your run wasn't accurate. Placement is by net WPM (speed adjusted for accuracy), so a fast-but-inaccurate run lands where it actually ranks. A run with 0 accuracy is 0 net WPM and won't win.
- The Rematch button now appears only once the whole race has finished (it did nothing earlier).

## 6.109.6 — 23 May 2026
- On the practice screen, the live stats (WPM, accuracy, word, elapsed) now sit directly above the typing text and stay grouped with it in the centre of the screen, instead of being pinned to the top with a gap below them.

## 6.109.5 — 23 May 2026
- You can now press **Escape** to open the command palette (the Cmd/Ctrl+K search panel), as well as Cmd/Ctrl+K. Escape only opens it when it wouldn't otherwise close something — so it still closes open menus, dialogs, the friends panel, and focus mode first, and never interrupts typing.

## 6.109.4 — 23 May 2026
- Internal changes only (the lobby migration is complete; removed its working notes).

## 6.109.3 — 23 May 2026
- Internal changes only (the private-lobby end-to-end test now types at a human speed so the race resolves to its results screen).

## 6.109.2 — 23 May 2026
- Internal changes only (added end-to-end browser tests for the public and private race lobbies).

## 6.109.1 — 23 May 2026
- Reworded the race screens around one idea: lobbies. Racing strangers drops you into a public lobby (the "Find race" button is unchanged); "Create lobby" / "Invite to a race" opens a private lobby you share with a friend. The old "challenge" wording is gone.

## 6.109.0 — 23 May 2026
- Removed the old offline "duels" feature. Racing a friend is now always a live lobby: open a friend's profile (or their menu) and "Invite to a race" creates a private lobby and sends them a Join notification — you both race in real time. The standalone Duels page and the older "beat my recorded run" challenges are gone.
- Pending race invites from friends now show up in the friends dock with a Join button, alongside who's online and who's broadcasting.

## 6.108.1 — 23 May 2026
- Internal changes only.

## 6.108.0 — 23 May 2026
- Racing a friend now opens a live lobby instead of an offline challenge. The "Race" button on a friend's profile (and "Invite to a race" in their menu) creates a private lobby, drops you in to wait, and sends them an in-app notification with a Join button. (First step of moving everything to lobbies; more to follow.)

## 6.107.3 — 23 May 2026
- Fixed: spamming keys the instant you enter a race (during matchmaking, the lobby, or the countdown) no longer registers anything or shows phantom progress on your lane. Input is now locked through every pre-race phase — including the brief moment while connecting — and only the race itself accepts typing. (The server already discarded any pre-race input, so this never affected other racers; it was your own screen showing local keystrokes early.)

## 6.107.2 — 23 May 2026
- Fixed: in tape mode, restarting (or starting a fresh run) now spawns the text already centred under the caret, instead of briefly appearing at the left and sliding into place.

## 6.107.1 — 23 May 2026
- Internal changes only (added end-to-end browser tests).

## 6.107.0 — 23 May 2026
- The typing text now sits in the centre of the screen by default, vertically as well as horizontally, instead of hugging the top with empty space below it.
- The on-screen keyboard is a bit smaller by default so it doesn't dominate the page (scale it back up under Customise → Keyboard if you prefer it large).
- Tape mode now opens with the first word in the centre of the screen and scrolls beneath the caret from there, rather than starting at the left edge.

## 6.106.0 — 23 May 2026
- Added a Tape fade option (Customise → Appearance → Tape). Soft or Strong fades the tape line toward its ends — already-typed words dissolve as they recede behind the caret, and the far-upcoming edge softens too, keeping your eye on the words around the cursor. Off keeps the line hard-edged.

## 6.105.1 — 23 May 2026
- Fixed (for real this time): typing during a race countdown no longer registers. The previous fix didn't hold; keystrokes are now blocked at the point they would become input, verified in a live race — the bar stays at 0% through the whole 3-2-1 and only moves once the race starts.

## 6.105.0 — 23 May 2026
- Tape mode is now complete. The passage collapses to a single line that scrolls under a fixed caret from the very first keystroke (it used to sit still at the start until you had typed past the middle). Choose how it tracks you — Letter (scrolls every keypress) or Word (scrolls per word) — and set where the caret sits with the Tape margin slider; it now opens left-of-centre so there's a long runway of upcoming text.
- Smooth scroll now works in every mode, including the letter tape and the normal stacked passage — the text glides instead of jumping.

## 6.104.3 — 23 May 2026
- Fixed: raw speed now counts how fast you press keys, regardless of accuracy. A fast but very inaccurate run used to show a raw speed of 0 on the race results; it now reflects every keystroke you made.
- Fixed: the personal-best crown only appears when you genuinely beat your best for that mode and length. Signed-in results now use your real history, so the crown no longer pops up on ordinary runs (for example the first run of a fresh session).

## 6.104.2 — 23 May 2026
- Fixed: in a multiplayer race you can no longer type during the 3-2-1 countdown. Keystrokes are now ignored until the race actually starts, so nobody gets a phantom head start.

## 6.104.1 — 22 May 2026
- Internal changes only.

## 6.104.0 — 22 May 2026
- Added a new "White Hat" identity tag — a cool slate-blue chip that sits beside a person's name (next to OG and Owner) to mark someone who has found and reported three or more major bugs. It's awarded by hand; in local development the owner sees it on their own profile so the look can be checked.

## 6.103.2 — 22 May 2026
- Fixed: joining a challenge lobby no longer leaves a duplicate "ghost" copy of the first joiner sitting in the room. Joining now claims exactly one spot, so when that person leaves they fully disappear for everyone.

## 6.103.1 — 22 May 2026
- Fixed: leaving a race lobby now removes you from it for everyone else. Previously, navigating away (browser back, a link) could leave a ghost copy of you sitting in the lobby until it timed out.
- When a race finishes, the results screen now takes over the whole area instead of sitting below the finished passage — the typing view is replaced by your standings, stats, and the rematch button.

## 6.103.0 — 22 May 2026
- Simplified the race modes: the picker now offers just 1V1 and Free-for-all. The 1V1V1V1, Sprint, and Endurance modes have been retired.

## 6.102.1 — 22 May 2026
- Added a standalone cover page at /landing: a single editorial screen with the flinttype name, a sample of the typing test, and a quick rundown of what the app does. It's a shareable preview image, not part of the normal navigation.

## 6.102.0 — 22 May 2026
- Race lobbies you host now stay open as long as you're on the page — even if nobody joins for a long time. Previously a quiet lobby could be closed out from under you while you waited for a friend; now it only shuts down once you actually leave (or your tab closes).
- When you rematch, anyone who left mid-race is cleared out cleanly, so their empty spot is freed up for a new player to join the next round.

## 6.101.13 — 22 May 2026
- Internal changes only.

## 6.101.12 — 22 May 2026
- Fixed: joining a race lobby that's already full or under way no longer crashes the page — you drop in as a spectator and watch the race live instead.
- Fixed: signed-in players can no longer end up racing themselves. Opening your own race link again just reconnects you to your existing spot instead of adding a duplicate of you.

## 6.101.11 — 22 May 2026
- Fixed: your appearance settings (theme, primary colour, and other customisations) no longer revert to the default on their own. A change you make on this device is now kept even when it hadn't finished saving to the server yet, instead of being overwritten by an older saved copy the next time the page loads.

## 6.101.10 — 22 May 2026
- The friends dock is now a fixed size, so opening the Member directory no longer makes the panel jump to a different size. Switching between Friends and the directory now slides cleanly (forward into the directory, back to Friends) instead of snapping.

## 6.101.9 — 22 May 2026
- Friends dock tidy-up: the panel is titled "Friends" now, and the member directory has a clear back arrow so you can always get back. The directory also lists everyone in your network — the people you follow and your followers — not just the people you follow. Hovering a row is now a calm neutral highlight instead of turning the name coral.

## 6.101.8 — 21 May 2026
- Clicking the "Member directory" bar in the friends dock now opens it as a full view: the bar becomes the panel's header and the complete list of everyone you follow fills the area, with its own search. Close it (the X, or back on mobile) to return to your active members.

## 6.101.7 — 21 May 2026
- Tidied some UI inconsistencies: the selected tab in the top navigation and the leaderboard's Global / Friends toggle now share one consistent rounded-corner radius, the highlighted "you" row on the leaderboard no longer spills past its rounded corner, and the small dots that floated between the leaderboard filter labels are gone.

## 6.101.6 — 21 May 2026
- The friends dock opens with a quiet fade now (the springy slide-in is gone). And the "Member directory" bar at the bottom actually does something: click it to expand the full list of everyone you follow right there in the panel, and click again to collapse it.

## 6.101.5 — 21 May 2026
- Internal changes only.

## 6.101.4 — 21 May 2026
- Opening the friends dock now animates: the panel springs up from the corner and your members sweep in one after another, instead of appearing all at once. (Respects "reduce motion" — it just fades in.)

## 6.101.3 — 21 May 2026
- Internal changes only.

## 6.101.2 — 21 May 2026
- The friends dock now positions itself correctly when you've hidden the footer (or on screens that don't show one): it drops to the bottom corner instead of floating in empty space above where the footer used to be.

## 6.101.1 — 21 May 2026
- The friends dock has a cleaner look: open it to a tidy "Active members" panel with a search box, your live and online friends listed with their status, a quick Watch or Accept button where it makes sense, and a member-directory row at the bottom. The dock now floats just above the page footer instead of overlapping it.

## 6.101.0 — 21 May 2026
- When you create a race lobby you can now pick from the full wordlist catalogue — the same searchable list of 440+ wordlists you use in practice (every language, code, and themed list), not just English. Everyone in the lobby races words from the list you chose.

## 6.100.1 — 21 May 2026
- Internal changes only.

## 6.100.0 — 21 May 2026
- Friends now live in a small dock in the bottom-right corner instead of a separate page. Open it from anywhere to see who's typing live, the challenges waiting for you, and everyone you follow, then jump straight to watching a friend or taking a challenge.
- The dock keeps out of your way: it tucks into the corner while you type and hides entirely on the race, live-watch, and duel screens.
- Challenges you've already taken on no longer clutter the list: only challenges still waiting to be played show in the dock, and finished ones live on your Duels page.

## 6.99.2 — 21 May 2026
- Duels now update on their own: when your opponent finishes the challenge, the result appears without you having to refresh the page.
- The duel typing area now matches your normal practice screen — same passage colours (including your chosen Appearance settings) and type styling.

## 6.99.1 — 21 May 2026
- Fixed: opening an old or expired race-challenge link — or returning to one whose lobby has already closed — no longer leaves you stuck on a blank screen. It now sends you back to the race menu.

## 6.99.0 — 21 May 2026
- New **Free-for-all** race: share one lobby and up to 8 people race the same passage at once — real players only, no bots.
- When you create a race lobby you can now set it up: pick the word list (English or common words), and choose either a word-count race (10 / 25 / 50 / 100 words) or a timed race (15 / 30 / 60 seconds).

## 6.98.5 — 21 May 2026
- Races are fairer: your speed is now measured from the moment the race starts, not from your first keystroke, and the winner is whoever has the highest real typing speed — not just whoever crosses the line first.
- Challenge lobbies are now real players only — no bots are added when you start a challenge you've shared.

## 6.98.4 — 21 May 2026
- Fixed: you can now scroll the race results screen on smaller windows — the placement, stats, and leaderboard no longer get cut off at the bottom.

## 6.98.3 — 21 May 2026
- Live spectating is lighter on the server: a friend who finishes a test and leaves the results screen open no longer stays in everyone's "Live now" forever — they drop out shortly after finishing unless someone's actually watching. Changes to your handle or shown tags now appear to friends right away. No change to what you see while actually watching a live run.

## 6.98.2 — 21 May 2026
- The feature previews on the update card are clearer now: real handles, speeds, a live passage, and an Accept button instead of placeholder bars.

## 6.98.1 — 21 May 2026
- The update card is now wide and condensed (landscape) so it looks good pasted into Discord: a headline and a single row of feature previews, less text, more visual.

## 6.98.0 — 21 May 2026
- The Friends page now uses the full page width like the rest of the app, with your people list on the left and what's-happening (challenges, who's online) on the right.
- "Live now" is bigger and more exciting: each live friend is a card showing their live speed and progress, with a clear "Watch live" button that opens their screen.

## 6.97.7 — 21 May 2026
- Your profile's Tests stat now shows how many you've started underneath the number you've completed (when they differ).

## 6.97.6 — 21 May 2026
- Update pages now show a little preview of each feature (the friends hub, challenges, live spectating, your profile) instead of plain icons.
- On profiles, the activity heatmap now shows your last 6 months, so the squares stay a comfortable size beside the skill chart.

## 6.97.5 — 21 May 2026
- Redesigned the profile's main card: a bigger experience bar now anchors the bottom of the card (no more empty gap under it), and your activity heatmap and skill chart share one tidy split card below.

## 6.97.4 — 21 May 2026
- Update pages are now a clean, light, icon-led card you can screenshot to announce a release, instead of a technical list. Find them via "Read the update" in the changelog.
- The version number now stays beside its notes as you scroll the changelog.

## 6.97.3 — 21 May 2026
- Your skill chart now sits compactly inside your main profile card, beside your stats, instead of taking up a whole separate section.

## 6.97.2 — 21 May 2026
- Fixed: the "Read the update" link in the changelog now shows on phones, not just desktop.

## 6.97.1 — 21 May 2026
- Internal: refreshed the skill-radar average baseline from real player data.

## 6.97.0 — 21 May 2026
- Big releases now get their own shareable update page: a single branded card showing what's new, linked from the changelog. The first one covers the whole Friends + Profile overhaul (find the "Read the update" link beside those versions in the changelog).
- Your profile's skill chart now compares your shape against the average typist (a dashed baseline behind your own), so it reads as a real comparison instead of looking arbitrary.

## 6.96.1 — 21 May 2026
- Friends: the Friends / Following / Followers switch now sits on the same row as the search box, and an incoming challenge's button reads "Accept".
- Profile: the skill chart is now a cleaner standalone graphic (Speed, Accuracy, Consistency, Endurance; Experience removed). Speed is scaled to 300 wpm and Endurance is your best run of 30 seconds or longer (up to 250 wpm). Fixed the chart labels overflowing and a stray box appearing when you clicked it. The experience bar in the header is bigger and now shows your total XP and how far you are from the next level, and the "Load more" runs button matches the rest of the buttons.

## 6.96.0 — 21 May 2026
- Redesigned the profile page to be something you'll want to share, even with people who don't use flinttype. A new skill chart shows your typing at a glance across Speed, Accuracy, Consistency, Endurance, and Experience, and you can pick a flame rank (Ember through Solar Flare) to wear beside your name. The header is cleaner, with your headline stats given full width to breathe, and the sparse "head to head" box is gone.

## 6.95.2 — 21 May 2026
- Internal changes only. (Unfollow/block confirmation now uses the app's shared dialog instead of a duplicate.)

## 6.95.1 — 21 May 2026
- Tidied the Friends page. The Friends / Following / Followers switch now matches the app's main navigation, so switches look consistent everywhere. The cluttered "Recent activity" section is gone; your friends' personal bests, new follows, and duel updates all still appear in the notifications bell. Removed the small arrow and eye icons for a cleaner, calmer look.

## 6.95.0 — 21 May 2026
- Challenges now live right on the Friends page instead of behind a link to another page. When a friend dares you to beat one of their runs, it shows up inline with their name and target speed, and you can jump straight into the race. The section stays hidden when there's nothing waiting.

## 6.94.0 — 21 May 2026
- The Friends page is redesigned to be calmer and more focused: a single, tidy column with a clear "Challenges" shortcut at the top, a nicer "Live now" preview, and "Live now" / "Online" sections that only show up when friends are actually there.
- Your people list now leads with your friends; Following and Followers sit quietly beside it instead of as chunky tabs.
- Managing someone (unfollow, block, or challenge to a duel) now lives in a ⋯ menu on their row and asks you to confirm before unfollowing or blocking, so nothing changes by an accidental click. The button no longer flips to "Unfollow" when you hover it.
- Recent activity is tucked into a tidy, expandable section with its own scroll, so the page stays uncluttered.

## 6.93.1 — 21 May 2026
- Internal changes only. (Dev-mode fake friends for testing the Friends page; not shown in production.)

## 6.93.0 — 21 May 2026
- You can now see what your friends are up to. On the Friends page, each person shows whether they're online, practising, or in a race right now, and when they were last active ("Active 5m ago") if they're offline. The Online strip marks who's typing or racing at a glance.

## 6.92.1 — 20 May 2026
- Internal: live spectating now sends your appearance and theme once instead of on every frame, so the stream is much lighter. No change to what watchers see.

## 6.92.0 — 20 May 2026
- Watching a friend now plays back smoothly, character by character, instead of jumping every second. The caret glides through their text as they type, with about a one-and-a-half-second delay to keep it fluid, and when they finish you watch the run complete before their results appear.

## 6.91.5 — 20 May 2026
- Fixed: when a friend you're watching finishes their run, you now see their results screen, instead of it dropping to "not live". Broadcasting now keeps going on the results screen too.

## 6.91.4 — 20 May 2026
- Fixed: watching a friend live again shows their full 1:1 screen. A recent efficiency change had briefly stripped the stream down to a basic mirror when they weren't being watched yet; the full screen is always sent now, and the streaming-only-when-needed efficiency stays.

## 6.91.3 — 20 May 2026
- More live-spectating efficiency: watching a friend who isn't live now polls slowly in the background instead of every second, and both watching and broadcasting pause completely while the tab is hidden.

## 6.91.2 — 20 May 2026
- Live spectating is much lighter now: your practice screen only streams while a friend is actually watching, or while you're actively typing, instead of constantly in the background. No change to what watchers see.

## 6.91.1 — 20 May 2026
- Cleaned up the live-watch screen: a slim header with a clear "Spectating" indicator, and the friend's screen now fills the whole view edge to edge instead of sitting in a small framed box.

## 6.91.0 — 20 May 2026
- Watching a friend is now fullscreen and immersive, with a slim header and a button to go truly fullscreen. And whenever someone is watching you, your practice screen shows a clear "ada is spectating" badge so you always know you're being watched.

## 6.90.0 — 20 May 2026
- Watching a friend now mirrors their whole practice screen: the mode they're on, the live passage as they type, and their full results page when they finish, themed exactly as they see it. It plays back with a smooth one-second buffer so it doesn't stutter.

## 6.89.0 — 20 May 2026
- Watching a friend practise now shows a faithful clone of their actual screen, with their theme, font, caret, and colours, and the same live passage and readouts they're looking at, instead of a stripped-down view.

## 6.88.0 — 20 May 2026
- The Friends page is now a social feed. A timeline shows what your friends are up to, who's typing live, their personal bests, duels, and new friendships, with your friends, following, and followers list right beside it. On desktop the list sits inline next to the feed instead of behind a pop-up panel.

## 6.87.0 — 20 May 2026
- Live spectating is now on by default, so mutual friends can watch you practise without you flipping a switch. While you type, your screen now shows who's currently watching ("ada is spectating", "3 people are spectating") instead of a static badge. You can still turn it off entirely, or keep specific friends out, in Customise → Behaviour → Live spectating.

## 6.86.3 — 20 May 2026
- Internal changes only.

## 6.86.2 — 20 May 2026
- Live spectating no longer cuts out partway through long timed runs, and the friends directory is now fully keyboard-accessible.

## 6.86.1 — 20 May 2026
- Watching a friend type live now shows their avatar and a clearer live readout, with their words, speed, and accuracy front and centre.

## 6.86.0 — 20 May 2026
- The Friends page is rebuilt around who's around right now. A "Live now" section shows friends typing live so you can jump straight in and watch them, an "Online" row shows who else is around, and your full friends, following, and followers lists live in a directory that slides up when you want it. Everyone shows their avatar now, and you can search the directory by handle.

## 6.85.0 — 20 May 2026
- You can now let friends watch you practise from wherever you type, not a separate page. Turn on Live spectating in Customise → Behaviour, and any practice run or drill becomes watchable by your mutual friends in real time. A small "Friends can watch" badge shows on screen while it's on, and it's off by default.

## 6.84.1 — 20 May 2026
- Internal changes only.

## 6.84.0 — 20 May 2026
- You can now watch friends type live. Turn on sharing on the new Practise live page, and any mutual friend can watch your words appear in real time from your profile or the Friends page. It's off by default and only mutual friends can ever watch.

## 6.83.0 — 20 May 2026
- Your Friends page now shows a green dot next to friends who are online right now.

## 6.82.0 — 20 May 2026
- Duels are here. Challenge a friend from their profile to beat one of your runs: you type a passage to set the pace, and they race a ghost of your speed to try to top it. See your challenges, sent and received, on the new Duels page, and get a notification when someone takes you on or beats your run.

## 6.81.0 — 20 May 2026
- When someone you follow sets a personal best, you'll now get a notification about it, so your bell doubles as a feed of your friends' wins.

## 6.80.0 — 20 May 2026
- Visiting someone else's profile now shows a head-to-head card comparing your best WPM, accuracy, and test count against theirs.

## 6.79.0 — 20 May 2026
- The leaderboard has a new Global / Friends toggle, so you can rank yourself against just the people you follow instead of the whole world.

## 6.78.0 — 20 May 2026
- Friends are here. Follow anyone from their profile, and a new Friends page lists who you follow, who follows you, and who you're mutual friends with. When you follow each other you become friends. You'll get a notification when someone follows you, your profile now shows follower and friend counts, and you can block people you'd rather not hear from.

## 6.77.10 — 20 May 2026
- More groundwork for the friends system — following, friends, and blocking now work behind the scenes (no visible UI yet).

## 6.77.9 — 20 May 2026
- Internal groundwork for an upcoming friends system (nothing user-facing yet).

## 6.77.8 — 20 May 2026
- The changelog page has a cleaner timeline layout, with each version's number and date pinned beside its changes as you scroll.

## 6.77.7 — 20 May 2026
- After an update, a "What's new" popup now shows you exactly what changed since your last visit.

## 6.77.6 — 20 May 2026
- The changelog page now shows the full, up-to-date release history, kept in sync with this file.

## 6.77.5 — 20 May 2026
- Internal changes only. (Added this changelog.)

## 6.77.3 — 20 May 2026
- Pressing "f" while typing no longer switches on focus mode — it just types the letter, during practice, drills, and races.

## 6.77.2 — 19 May 2026
- Dark-mode menus and dropdowns no longer flash a bright orange block on hover; highlights are quiet again by default.

## 6.77.1 — 19 May 2026
- Hover highlights on menus and pickers are now a soft neutral tint instead of bright coral, so the brand colour only marks genuinely active items.

## 6.77.0 — 19 May 2026
- New visitors start with a more refined default setup — a calmer typing area, tuned caret and live stats, and a shorter 25-word default test.

## 6.76.2 — 19 May 2026
- The Editorial / Minimal / Stripped preset buttons on the customise page now highlight the one you're using and clear the moment you change a single setting.

## 6.76.1 — 19 May 2026
- Drills cards are now all the same size with a cleaner hover lift, and the last row no longer shows odd gray gaps.

## 6.76.0 — 19 May 2026
- The drills page gained filter chips — All, Tailored, Generic, Sudden death, Burst, Available now — each with a live count, replacing the old two-section split.

## 6.75.1 — 19 May 2026
- The sign-in and sign-up screens now use one consistent button style for method choices and small links like "Forgot password?" and "Resend code".

## 6.75.0 — 19 May 2026
- Sign-in and sign-up moved to a single centered card that gently fades in on load.

## 6.74.2 — 19 May 2026
- Polished the sign-in screen so its dark brand side and form side feel balanced — bigger brand text, a brighter glow, and a wider form.

## 6.74.1 — 19 May 2026
- Cleaned up the sign-in screen's dark panel with a smaller, better-placed glow and no duplicate logo.

## 6.74.0 — 19 May 2026
- Sign-in and sign-up were redesigned into a full-screen two-panel layout: a dark branded side and a form side that follows your theme (stacked on mobile).

## 6.73.0 — 19 May 2026
- You can now reset a forgotten password straight from the sign-in form — get a code by email, enter it, and set a new one.

## 6.72.1 — 19 May 2026
- Signing in with an email code now uses six clean single-digit boxes that submit automatically once filled.

## 6.72.0 — 19 May 2026
- You can now sign in without a password — using a one-time code emailed to you, or a magic link you click from your inbox.

## 6.8.0 — 12 May 2026
- Leaderboard rebuilt with a sidebar filter rail, full-width table, and a simpler ranked layout.
- New /blog, /changelog, and /faq pages launched alongside /privacy and /terms.
- Sitemap and crawler index updated to cover every public page.

## 6.7.0 — 12 May 2026
- New /privacy and /terms pages with a shared editorial layout.

## 6.6.0 — 11 May 2026
- The global leaderboard now ranks real net-WPM with mode and time-window filters.
- New /about page and richer homepage metadata for search.
- Top bar redesigned — calmer nav, a consolidated lineup panel, and a race podium.

## 6.5.0 — 10 May 2026
- Multiplayer race surface — friendly challenge links, real-time progress, and bot fillers.
- Race runs now roll into your history and your weakness profile.
- Race rooms stay alive across reconnects.

## 6.0.0 — May 2026
- Full /customise surface — palette, mode, geometry, caret, typography, keyboard, background, live stats, typing area, result, and keymap.
- Mobile-first pass across every surface, with bottom-sheet pickers in settings.
- Insights and drills pages with per-bigram weakness ranking, a WPM trend, and targeted drills.
