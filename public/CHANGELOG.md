# Changelog

User-facing changes to flinttype, newest first — one section per version. Also served raw at `/changelog.md`; the `/changelog` page renders it.

- Write each line in plain language: what the user now **sees** or **can do**. No jargon, no file / function / symbol names.
- Versions whose changes don't concern the user (refactors, tests, tooling, internal fixes) get a single brief line, e.g. `- Internal changes only.`
- Updated on every version bump — see `CLAUDE.md` → **Commit discipline**.

---

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
