# Design

Visual system for flinttype. This captures the real tokens shipped in `src/app/globals.css` and the laws in `docs/ui-law.md` (the authoritative design doc; consult it before any UI change). DESIGN.md is the summary; ui-law.md wins on conflict.

## Theme

Warm, rounded and calm: paper-and-ink with pill controls, soft rounded cards and the logo's orange as the theme colour on every action and selection (ui-law §21 owns shape and depth). The default brand surface is **light** ("paper") with **warm-ink dark** available. For an intentionally-fixed brand asset (the landing/cover page), the surface is chosen for the scene, not the user's theme, and built from the fixed `ft-*` tokens so it screenshots identically regardless of mode.

Scene sentence for the landing/cover: *a typographer's pasteboard at midday, one printed coral mark on warm paper, calm and exact.* That forces **light paper** as the cover surface, with the option of a single dark inset (the keyboard widget / a code-ink band) for contrast.

## Color

OKLCH-based, tinted toward a warm paper hue (≈85°). Strategy: **Restrained** — tinted neutrals carry the surface, one coral accent ≤ ~10%.

### Semantic tokens (theme-aware, swap with mode/palette)
| Role | Light value | Use |
|---|---|---|
| `--background` | `oklch(0.945 0.018 85)` | page (warm paper) |
| `--foreground` | `oklch(0.19 0.012 60)` | primary text (warm ink) |
| `--card` | `oklch(0.965 0.015 85)` | lifted surface |
| `--primary` | `#f97316` (both modes) | **the brand orange from the flame logo** — CTAs, active nav, selected segments, caret, focus |
| `--primary-foreground` | white | text on the primary / `brand-surface` fill |
| `--muted-foreground` | `oklch(0.4386 0 0)` | captions, secondary metadata |
| `--accent` | `oklch(0.89 0.016 85)` | quiet neutral hover tint, one step darker than `--muted` |
| `--border` | `oklch(0.87 0.018 85)` | warm hairline |
| `--thumb` | derived | raised thumb of a segmented switch |

### Fixed `ft-*` tokens (do NOT swap with theme — for intentionally-fixed brand surfaces)
| Token | Value | Use |
|---|---|---|
| `--color-ft-paper` | `hsl(38 33% 92%)` | cover page background |
| `--color-ft-paper-2` | `hsl(38 28% 88%)` | secondary paper |
| `--color-ft-paper-soft` | `#faf7f0` | warmer paper (panels) |
| `--color-ft-ink` | `hsl(0 0% 8%)` | ink text/marks |
| `--color-ft-ink-deep` | `#0a0a09` | deepest dark inset (keyboard / passage band) |
| `--color-ft-ember` | `var(--primary)` | the spark, fixed-layer alias of `--primary` |
| `--color-ft-ember-soft` | `--primary` 55% into the background | softer ember |
| `--color-ft-spark` | `hsl(20 75% 88%)` | ember highlight tint |
| `--color-ft-dim` | `hsl(0 0% 55%)` | dim text on paper |
| `--color-ft-dim-2` | `hsl(0 0% 35%)` | stronger dim |
| `--color-ft-line-soft` | `hsl(38 20% 86%)` | hairline on paper |
| `--color-ft-line` | `hsl(0 0% 16%)` | hairline on ink |
| `--color-ft-ok` | `hsl(110 25% 39%)` | success / online |
| Warm-ink dims | `#B5AF9F` / `#9C978A` / `#6E695F` / `#5C5950` | text on dark ink surfaces |

**One-spark rule:** at most one saturated coral element should dominate the eye on any view. Everything else paper/ink/dim.

## Typography

**Plus Jakarta Sans** for the interface, **IBM Plex Mono** for code, keycaps and the optional mono passage (Lora only as the passage's "Serif" option). `tabular-nums` on every stat. Chrome text is 13–14px sentence case; uppercase tracked labels only for small in-page eyebrows.

## Layout & Spacing

Tailwind's default 4px spacing scale (the old `--spacing: 0.27rem` override is gone, so every utility lands on whole pixels). Mobile-first: unprefixed = 375px, `sm:`/`md:`/`lg:` scale up only. One horizontal gutter everywhere: `px-4 sm:px-6` (top bar, page content, footer). App pages use `<PageShell>` (`max-w-6xl`, `gap-10 sm:gap-12`); reading pages `max-w-2xl`.

## Shape & depth

Controls are pills (`rounded-pill`), cards are `rounded-2xl` (`--radius: 1rem`), floating layers use `shadow-float`, cards a soft `shadow-card`, the one primary button a faint `shadow-glow`. Every one of these is a token the user can retune in Settings → Style.

## Components (reuse, never re-roll)

`src/components/ft/`: `<Logo>` (flame SVG + FLINTTYPE wordmark), `<TopBar>`, `<MobileNav>`, `<IdentDot>`, `<Tag>` (tones: dim/ink/ember/ok), `<Stat>` (sizes sm–xl, `accent` paints coral), `<Panel>` (bordered titled surface), `<Kbd>` (keycap chip), `<FtButton>` (square, uppercase, tracked; variants ink/ember/ghost/ghostDark), `<Avatar>`, `<UserTag>`. shadcn primitives in `src/components/ui/`. Brand mark always via `<Logo>` / `/public/flinttype-logo.svg` — never hand-rolled.

## Motion

Animation is the exception (editorial-mechanical fights ambient motion). `framer-motion` only, sparingly. Ease-out exponential curves, no bounce. Every animation collapses to a static frame under `prefers-reduced-motion`. For a cover/screenshot asset: motion is essentially nil (it must look right frozen).

## Absolute bans

No `#000`/`#fff` (tint toward the paper hue). No gradient text. No hero-metric template. No side-stripe borders. No em dashes in copy. No hard-coded radius or shadow on a control or surface (use the §21 tokens). Never two filled primary buttons in one view.
