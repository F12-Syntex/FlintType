# Changelog

User-facing changes to flinttype, newest first — one section per version. Also served raw at `/changelog.md`; the `/changelog` page renders it.

- Write each line in plain language: what the user now **sees** or **can do**. No jargon, no file / function / symbol names.
- Versions whose changes don't concern the user (refactors, tests, tooling, internal fixes) get a single brief line, e.g. `- Internal changes only.`
- Updated on every version bump — see `CLAUDE.md` → **Commit discipline**.

---

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
