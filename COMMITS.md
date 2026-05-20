# Commits

Human-readable commit log, newest first. **This file is the source the changelog is generated from** — so the plain-English line in each entry is written as user-facing changelog copy: one short sentence, no jargon, no symbol / file / function names, framed as what the user now sees or can do.

Each entry has a fixed shape so it can be parsed:

```
## type(scope): subject title
`version` · date

One short, non-technical sentence — the changelog line.

_Technical:_ a brief note for developers (optional, ignored by the changelog).
```

- **type** (`feat` / `fix` / `chore` / `docs` / `refactor` / …) and **scope** parse from the heading; **version** and **date** from the line under it. A changelog build reads `feat` and `fix` entries and may skip the rest.
- For a commit with **no user-visible effect** (internal refactor, test-only, tooling), make the plain-English line say so plainly — e.g. *"Internal change, nothing visible."* — so the changelog can omit it.
- `git log` remains the exhaustive source of truth; this file is the curated, readable layer.

---

## docs(commits): add a plain-English commit log for the changelog
`6.77.4` · 20 May 2026

Internal change, nothing visible yet — adds a readable commit history written for non-technical readers, which the changelog will be built from.

_Technical:_ new `COMMITS.md` (curated, newest-first, parseable entries) seeded with the last 15 commits; `CLAUDE.md` commit discipline now requires body line 1 to be a short non-technical sentence and a mirrored `COMMITS.md` entry per commit.

## fix(focus): stop `F` toggling focus mode mid-exercise
`6.77.3` · 20 May 2026

Pressing "f" while typing no longer switches on focus mode — it just types the letter, during practice, drills, and races.

_Technical:_ window-capture typing surfaces have no focused input, so the global `F` shortcut couldn't tell typing from a toggle. A ref-counted `data-ft-typing-surface` marker now flags an active run and `FocusShortcut` stands down while it's set; Esc and the input guard are unchanged.

## fix(theme): stop pinning a loud --accent in the default baseline
`6.77.2` · 19 May 2026

Dark-mode menus and dropdowns no longer flash a bright orange block on hover — highlights are quiet again for everyone on the default theme.

_Technical:_ the default "custom" palette wrote a peach `--accent` as an inline `<html>` var that shadowed the 6.77.1 globals.css retune; dropping it lets hover inherit the mode-aware neutral tint from `:root`/`.dark`.

## fix(theme): retune --accent to a quiet neutral hover tint
`6.77.1` · 19 May 2026

Hover highlights on menus and pickers are now a soft neutral tint instead of bright coral, so the brand colour only marks genuinely active items.

_Technical:_ `--accent` retuned from saturated coral to a low-chroma warm dim (light) / neutral lift (dark). ui-law §2 documents accent as the canonical quiet hover token; §9.2 says to de-saturate loud tweakcn accents.

## feat(prefs): reset every DEFAULT_* baseline to match the user export
`6.77.0` · 19 May 2026

New visitors start with a more refined default setup — a calmer typing area, tuned caret and live stats, and a shorter 25-word default test.

_Technical:_ every `DEFAULT_*` baseline reset from a supplied settings export (caret, ~14 appearance keys, default length 50 → 25, palette `activeId` "custom"); previous defaults snapshotted to `docs/defaults-previous-2026-05-19.json` for rollback.

## fix(customise): surface preset chips now reflect the active bundle
`6.76.2` · 19 May 2026

The Editorial / Minimal / Stripped preset buttons on the customise page now highlight the one you're using and clear the moment you change a single setting.

_Technical:_ bundles lifted to `SURFACE_PRESETS`; `detectSurfacePreset` matches current prefs to a bundle and `SurfacePresetRow` lights the matching chip (null when mixed).

## fix(drills): consistent-size cards, no bg-border bleed in partial rows
`6.76.1` · 19 May 2026

Drills cards are now all the same size with a cleaner hover lift, and the last row no longer shows odd gray gaps.

_Technical:_ `DrillBento` moved from an auto-fit `bg-border` wrapper to a fixed responsive `grid-cols` of discrete cards; `DrillCell` modernised with a tinted `KindBadge`, a top-right `StatusPip`, and a self-bordered hover-lift.

## feat(drills): chip-filtered single grid replaces tailored/generic split
`6.76.0` · 19 May 2026

The drills page gained filter chips — All, Tailored, Generic, Sudden death, Burst, Available now — each with a live count, replacing the old two-section split.

_Technical:_ new `DrillsFilters` driven by a single `DRILL_FILTERS` array (id, label, predicate); `DrillsView` collapses to one filtered grid with an empty state.

## fix(auth): consistent shadcn Button across method picker and utility actions
`6.75.1` · 19 May 2026

The sign-in and sign-up screens now use one consistent button style for method choices and small links like "Forgot password?" and "Resend code".

_Technical:_ method rows became full-width shadcn outline Buttons (icon + label + chevron); a single `UtilityButton` (ghost, sm) replaces every ad-hoc low-emphasis link and the old `BackLink`.

## feat(auth): swap split shell for centered single-card layout
`6.75.0` · 19 May 2026

Sign-in and sign-up moved to a single centered card that gently fades in on load.

_Technical:_ `AuthShell` is now a centered `bg-background` card (logo + eyebrow + title + description + form + alt-link) animating in with the shared `animate-in` utilities; brand-panel props dropped.

## fix(auth): give dark panel real weight, beef up form column
`6.74.2` · 19 May 2026

Polished the sign-in screen so its dark brand side and form side feel balanced — bigger brand text, a brighter glow, and a wider form.

_Technical:_ brand line scales to `text-7xl` on lg with a kicker subline + editorial stamp; glow grown to `size-96`/`size-72`; form column `max-w-md` → `max-w-lg` with a larger title.

## fix(auth): shrink coral glow to match reference, drop duplicate brand mark
`6.74.1` · 19 May 2026

Cleaned up the sign-in screen's dark panel with a smaller, better-placed glow and no duplicate logo.

_Technical:_ glow shrunk from `w-3/4 max-w-md` to `size-60` + `size-32`; removed the redundant wordmark tag; brand line anchored to the lower half on desktop via `md:mt-auto md:mb-8`.

## feat(auth): replace AuthShell card with fullscreen split layout
`6.74.0` · 19 May 2026

Sign-in and sign-up were redesigned into a full-screen two-panel layout: a dark branded side and a form side that follows your theme (stacked on mobile).

_Technical:_ always-dark left panel (`bg-ft-ink-deep`, layered glows, logo, brand line) + theme-aware right panel (`bg-card`); `AuthShell` gains optional `eyebrow`/`brandLine`; ui-law §5 gains the "Auth split shell" recipe.

## feat(auth): forgot-password flow on the sign-in form
`6.73.0` · 19 May 2026

You can now reset a forgotten password straight from the sign-in form — get a code by email, enter it, and set a new one.

_Technical:_ "Forgot password?" runs `signIn.create({ strategy: 'reset_password_email_code' })` → reset-code stage (OTP) → `attemptFirstFactor` → `needs_new_password` → `signIn.resetPassword`, with inline resend and confirm-mismatch checks.

## feat(auth): segmented 6-slot OTP input for email-code sign-in
`6.72.1` · 19 May 2026

Signing in with an email code now uses six clean single-digit boxes that submit automatically once filled.

_Technical:_ added the shadcn `input-otp` primitive (+ dep) and `--animate-caret-blink` token; `CodeStage` renders 6 digit-only slots (`REGEXP_ONLY_DIGITS`) with `onComplete` auto-submit, sized to fit at 375 px.

## feat(auth): add email-code and magic-link sign-in methods
`6.72.0` · 19 May 2026

You can now sign in without a password — using a one-time code emailed to you, or a magic link you click from your inbox.

_Technical:_ `sign-in-form.tsx` promoted to a folder (orchestrator + stages + shared); a 5-stage funnel (email → method picker → password / email_code / email_link) driven by Clerk's `supportedFirstFactors`; magic-link uses `createEmailLinkFlow` + a `/sign-in/verify` page.
