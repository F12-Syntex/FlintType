# Design

Visual system for flinttype. This captures the real tokens shipped in `src/app/globals.css` and the laws in `docs/ui-law.md` (the authoritative design doc; consult it before any UI change). DESIGN.md is the summary; ui-law.md wins on conflict.

## Theme

Editorial-mechanical: paper-and-ink. The default brand surface is **light** ("paper") with **warm-ink dark** available. For an intentionally-fixed brand asset (the landing/cover page), the surface is chosen for the scene, not the user's theme, and built from the fixed `ft-*` tokens so it screenshots identically regardless of mode.

Scene sentence for the landing/cover: *a typographer's pasteboard at midday, one printed coral mark on warm paper, calm and exact.* That forces **light paper** as the cover surface, with the option of a single dark inset (the keyboard widget / a code-ink band) for contrast.

## Color

OKLCH-based, tinted toward a warm paper hue (≈85°). Strategy: **Restrained** — tinted neutrals carry the surface, one coral accent ≤ ~10%.

### Semantic tokens (theme-aware, swap with mode/palette)
| Role | Light value | Use |
|---|---|---|
| `--background` | `oklch(0.945 0.018 85)` | page (warm paper) |
| `--foreground` | `oklch(0 0 0)` | primary text (ink) |
| `--card` | `oklch(0.965 0.015 85)` | lifted surface |
| `--primary` | `oklch(0.6551 0.2312 34.7438)` | **the coral spark** — CTA, next key, one stat |
| `--primary-foreground` | `oklch(1 0 0)` | text on coral |
| `--muted-foreground` | `oklch(0.4386 0 0)` | captions, secondary metadata |
| `--accent` | `oklch(0.905 0.014 85)` | quiet neutral hover tint (never a 2nd coral) |
| `--border` | hairline | default outline |

### Fixed `ft-*` tokens (do NOT swap with theme — for intentionally-fixed brand surfaces)
| Token | Value | Use |
|---|---|---|
| `--color-ft-paper` | `hsl(38 33% 92%)` | cover page background |
| `--color-ft-paper-2` | `hsl(38 28% 88%)` | secondary paper |
| `--color-ft-paper-soft` | `#faf7f0` | warmer paper (panels) |
| `--color-ft-ink` | `hsl(0 0% 8%)` | ink text/marks |
| `--color-ft-ink-deep` | `#0a0a09` | deepest dark inset (keyboard / passage band) |
| `--color-ft-ember` | `hsl(9 78% 58%)` | **the coral spark** (fixed-layer) |
| `--color-ft-ember-soft` | `hsl(15 80% 75%)` | softer ember |
| `--color-ft-spark` | `hsl(20 75% 88%)` | ember highlight tint |
| `--color-ft-dim` | `hsl(0 0% 55%)` | dim text on paper |
| `--color-ft-dim-2` | `hsl(0 0% 35%)` | stronger dim |
| `--color-ft-line-soft` | `hsl(38 20% 86%)` | hairline on paper |
| `--color-ft-line` | `hsl(0 0% 16%)` | hairline on ink |
| `--color-ft-ok` | `hsl(110 25% 39%)` | success / online |
| Warm-ink dims | `#B5AF9F` / `#9C978A` / `#6E695F` / `#5C5950` | text on dark ink surfaces |

**One-spark rule:** at most one saturated coral element should dominate the eye on any view. Everything else paper/ink/dim.

## Typography

**JetBrains Mono everywhere** (loaded as `--font-mono-primary`). Weights 300–800. `tabular-nums` on every stat. No serif, no sans, no second face.

| Role | Treatment |
|---|---|
| Display (hero) | `text-5xl font-extrabold leading-[0.92] tracking-[-0.04em]` → up to `lg:text-[124px]` |
| H1 | `text-3xl font-extrabold tracking-tight` → `lg:text-6xl` |
| H2 | `text-2xl font-bold tracking-tight` → `lg:text-[44px]` |
| Eyebrow / tag | `text-[10px] font-medium uppercase tracking-[0.18em] text-ft-dim` (via `<Tag>`) |
| Nav link | `text-[11px] uppercase tracking-[0.14em]` |
| Stat value | `tabular-nums`, `text-[22px]`–`text-4xl`, `tracking-[-0.02em]`→`[-0.04em]` (via `<Stat>`) |
| Passage word | `text-2xl leading-[1.7] sm:text-[26px]`, dim→ink as cursor advances |
| Caption | `text-[11px] text-ft-dim` |

Tracking is load-bearing: `0.18em` uppercase = label, `0.14em` = nav, `-0.02em…-0.04em` = display.

## Layout & Spacing

Tailwind numeric scale only (`0.5,1,2,3,4,5,6,8,10,12,16,20`), no arbitrary px. Mobile-first: unprefixed = 375px, `sm:`/`md:`/`lg:` scale up only. Page padding `px-4 sm:px-8`, vertical `py-10 sm:py-20`. Section gap `gap-8 sm:gap-10`. Hairline section breaks (1px), never box-shadows on product surfaces.

## Geometry

Small radius. Interactive surfaces use `rounded-md` (`--radius-md`). Never `rounded-xl`+ on a control. Severity/marker dots are 6×6 **squares**, not circles.

## Components (reuse, never re-roll)

`src/components/ft/`: `<Logo>` (flame SVG + FLINTTYPE wordmark), `<TopBar>`, `<MobileNav>`, `<IdentDot>`, `<Tag>` (tones: dim/ink/ember/ok), `<Stat>` (sizes sm–xl, `accent` paints coral), `<Panel>` (bordered titled surface), `<Kbd>` (keycap chip), `<FtButton>` (square, uppercase, tracked; variants ink/ember/ghost/ghostDark), `<Avatar>`, `<UserTag>`. shadcn primitives in `src/components/ui/`. Brand mark always via `<Logo>` / `/public/flinttype-logo.svg` — never hand-rolled.

## Motion

Animation is the exception (editorial-mechanical fights ambient motion). `framer-motion` only, sparingly. Ease-out exponential curves, no bounce. Every animation collapses to a static frame under `prefers-reduced-motion`. For a cover/screenshot asset: motion is essentially nil (it must look right frozen).

## Absolute bans (from ui-law + impeccable)

No `#000`/`#fff` (tint toward paper hue). No gradient text. No glassmorphism by default. No hero-metric template. No identical card grids. No side-stripe borders. No em dashes in copy. No box-shadows on product surfaces.
