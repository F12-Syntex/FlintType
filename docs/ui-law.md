# UI Law

The authoritative design document for this project. Every UI change must conform to the rules below.

flinttype is **warm, rounded and calm**: the **brand orange from the flame logo** (`#f97316`, the core stop of `public/flinttype-logo.svg`) is the theme colour against a warm paper-and-ink palette, set in Plus Jakarta Sans with IBM Plex Mono for code and keycaps. **Controls are pills** (`rounded-pill` — buttons, chips, segmented switches, inputs, nav links); **surfaces are soft rounded cards** (`rounded-2xl`) with a hairline and a gentle warm lift (`shadow-card`); floating layers (popovers, menus, dialogs, the friends dock) hover with `shadow-float`. Tabular numerics on every stat. Charts are line-art. The shape and depth rules live in **§21**; every one of them is user-tunable (Settings → Style), so components must route through the tokens, never hard-code a radius or shadow.

**The orange is the theme — never swap it for black.** Selection and action states wear it: the primary button, the active top-bar route, the selected option of every segmented switch, the caret, focus rings, the user's own row. Restraint applies to *data*: stats, bars and badges stay ink so the orange keeps meaning "this is selected / this is the action".

**Minimal first.** Every screen answers one question and the primary action is obvious. Copy is plain sentence case; uppercase tracked labels are reserved for small eyebrows inside pages, never for chrome.

**Mobile-first is not optional.** Section 10 mandates every UI be authored for 375 px first and scaled up. The flinttype design source is desktop-first (1440 px artboards) — translate by stacking columns and reducing density on mobile, never by leaving small viewports broken.

## The Meta-Rule

> **Any new pattern not already in this document must be added here *first*, then adopted in code — in the same commit.**
>
> - If the convention exists below: use it exactly as specified.
> - If it doesn't: open this file, add the row/section with a one-line rationale, and ship it alongside the code that uses it.
> - Retroactive documentation is how inconsistency creeps in. The document leads; the code follows.

If you reach for a color, spacing value, typography class, or layout pattern that isn't in this document, **stop and amend the document**.

**No glyph separators.** Never join UI facts with "·", "•", "|" or "/". Use structure (a `<FieldList>`, table columns, a two-line title over a muted line), spacing, a vertical `<Separator>`, or a sentence. Never phrase progress as "N% to X" or a comparison as "N% over Y": draw a `<LabelledProgress>` or `<RangeTrack>`, or state the gap in felt units. `<Badge>` is only for one-word categorical states ("You", "Adapt", "Guest"), never for metadata. The one exception is the document title template (`"%s | flinttype"`, `docs/seo.md` S2): it is browser chrome, not page copy, and seo.md prescribes it.

---

## 1. Component reuse

### 1.1 shadcn primitives are the source of primitives
- `Button`, `Input`, `Dialog`, `Sheet`, `Select`, `Tabs`, etc. — install via the `shadcn` MCP or `yarn shadcn add <name>` and use them.
- Never hand-roll a primitive shadcn provides. Never inline-style a raw `<button>`.
- If shadcn doesn't cover a need, build the component **once** (see §1.2) and reuse across the app.

### 1.2 Where components live
- Route-scoped composite (used by one page only): `src/app/<route>/_components/<name>.tsx`.
- Cross-route reusable: `src/components/<name>.tsx`.
- shadcn-generated primitive: `src/components/ui/<name>.tsx` (don't hand-edit unless explicitly noted in the file).

See `docs/organization.md` for file-length thresholds and the full decision table covering every kind of code.

### 1.3 Testing policy
Frontend is **tested manually in the browser** — `yarn dev`, open the page, exercise the flow. No unit tests for React components, pages, layouts, or route-scoped `_components`. The things that *are* tested via `yarn test`:

- Data layer (`src/db/**/*.ts` excluding React hooks like `src/db/client/hook.ts`)
- Isomorphic helpers (`src/lib/**/*.ts` that don't pull React — `errors`, `safe`, `backend`, `themes`, `use-async-action`'s `runAsync` export)
- Backend (`src/server/**`)

React hooks and components (anything importing from `react` that renders or subscribes to component state) stay out of the automated suite — they're validated by clicking through the app.

**Exception: pure reducers / helpers inside an `_components` file may still be tested.** A reducer is a pure function — even when it lives next to `useReducer` inside a `.tsx` module, calling it with a `State + Action` and asserting the output is exactly the kind of deterministic check the automated suite is for. The rule blocks *render-tree* tests, not pure-logic tests. Co-locate the test next to the module (`practice-reducer.test.ts` next to `practice-reducer.ts`), mock the module's React-side imports (`@clerk/nextjs`, etc.) in the test, and import only the pure exports (`reducer`, `initialState`, etc.). Live precedent: `src/app/_components/practice-reducer.test.ts`, plus `practice-reducer-capture.test.ts` and `practice-capture-property.test.ts` for the run recording.

Mirror-rule in `docs/backend-rules.md` R12 exclusions table.

---

## 2. Colors

**Use the theme-aware semantic classes defined in `src/app/globals.css`. Never inline arbitrary hex.**

The semantic classes (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`, …) are defined once for light (`:root`) and once for dark (`.dark`) in `globals.css`, with per-palette overrides in `themes.css`. They swap automatically with `<ModeToggle>` (light/dark) and `<ThemeSwitcher>` (palette). Reach for them by default — every product surface should follow the user's chosen theme.

**One accent, used sparingly.** The brand orange (`#f97316`) lives in `--primary`. It flags the user's gaze: the next-expected key, the active CTA, peak/stall callouts, an error word. If two primary-coloured elements compete on screen, drop one to ink or muted. The whole product reads as paper-and-ink with a single spark.

### 2.1 The semantic palette

| Class                                              | CSS var                                  | Use                                                            |
|----------------------------------------------------|------------------------------------------|----------------------------------------------------------------|
| `bg-background`                                    | `--background`                           | Page background. Also the right surface for a panel that should melt into the page. |
| `text-foreground`                                  | `--foreground`                           | Primary text.                                                  |
| `bg-card`, `text-card-foreground`                  | `--card`, `--card-foreground`            | Card / keycap / lifted surface against the page.               |
| `bg-popover`, `text-popover-foreground`            | `--popover`, `--popover-foreground`      | Popover, dropdown, dialog panel.                               |
| `bg-muted`                                         | `--muted`                                | De-emphasised surface (rail, chip, inset row).                 |
| `text-muted-foreground`                            | `--muted-foreground`                     | De-emphasised text — captions, secondary metadata, shift-glyph on a key. |
| `bg-primary`, `text-primary-foreground`, `border-primary` | `--primary`, `--primary-foreground` | **The brand spark.** Pressed key, active CTA, peak marker, error word. The brand coral in the default palette; remains the active-state colour under community palettes. |
| `bg-secondary`, `text-secondary-foreground`        | `--secondary`, `--secondary-foreground`  | Secondary surface (the dark quote band in the default palette). |
| `bg-accent`, `text-accent-foreground`              | `--accent`, `--accent-foreground`        | **The canonical hover / highlight tint.** A low-chroma *neutral* lift (dark) / dim (light) — never a saturated colour. Hover must read as a quiet surface shift, not the brand spark; if the accent looks like a second coral, the surface fights `--primary`. This is the one token every interactive list/row/item hover should route through (dropdown, command palette, ghost buttons, pickers, nav). |
| `bg-destructive`, `text-destructive-foreground`    | `--destructive`, `--destructive-foreground` | Destructive action.                                         |
| `border-border`                                    | `--border`                               | Default shadcn hairline (used by Button, Input, etc.).         |
| `border-foreground/10`                             | `--foreground` @ 10%                     | **Soft** hairline that swaps with theme — the right default for keycap-style affordances and most panel borders. |
| `bg-foreground`, `text-background`                 | `--foreground`, `--background`           | Full inversion (active toggle, picker pill).                   |

Analysis surfaces follow §27 rule 4: data is ink, and only the one item the page's primary action addresses may be orange.

### 2.2 Choosing the right class

| You want…                                                                  | Reach for…                                          |
|----------------------------------------------------------------------------|-----------------------------------------------------|
| The page background                                                        | `bg-background` (with `text-foreground`)           |
| A card / lifted surface against the page                                   | `bg-card text-card-foreground`                      |
| The single brand spark (active state, next-expected key, error word)       | `bg-primary text-primary-foreground border-primary` |
| De-emphasised text                                                         | `text-muted-foreground`                             |
| A panel that should melt into the page (e.g. the Keyboard widget surround) | `bg-background border border-foreground/10`        |
| A soft hairline that swaps with theme                                      | `border-foreground/10`                              |
| The crisp shadcn outline border (Button, Input)                            | `border-border`                                     |
| A hover state on a list row / nav link / menu item / picker option         | `hover:bg-accent` (+ `hover:text-accent-foreground` when text needs the pairing) — the quiet neutral tint, never `hover:bg-primary` / `hover:text-primary`. `hover:bg-foreground/[0.03]` is the equivalent fixed-opacity tint already used on some dark editorial chrome; prefer `bg-accent` on theme-aware surfaces so one token governs every hover. |

### 2.3 `ft-*` tokens — fixed-palette layer (use sparingly)

A parallel `ft-*` palette (`bg-ft-paper`, `text-ft-ink`, `bg-ft-ember`, …) is also registered via `@theme` in `globals.css`. These tokens are **fixed** — they don't swap with `<ModeToggle>` or `<ThemeSwitcher>`. Several existing components (`<Tag>`, `<Stat>`, `<Panel>`, `<FtButton>`, `<TopBar>`) are built on them.

For *new* components, prefer §2.1 semantic classes — they follow the user's chosen theme. Reach for `ft-*` only when you genuinely want a fixed surface (the dark race screen, the supporter pricing card) that ignores the user's palette by design.

When you touch an existing `ft-*`-styled component for an unrelated reason, leave the existing classes alone — incidental migrations create noisy diffs. When you touch it specifically to make it theme-aware, swap using this table:

| Fixed `ft-*`                                 | Theme-aware replacement                               |
|----------------------------------------------|-------------------------------------------------------|
| `bg-ft-paper`, `bg-ft-paper-2`               | `bg-background` (page) / `bg-card` (lifted surface)   |
| `bg-ft-ink`, `bg-ft-ink-2`                   | `bg-background` (page in dark) / `bg-card`            |
| `text-ft-ink`, `text-ft-paper`               | `text-foreground`                                     |
| `text-ft-dim`, `text-ft-dim-2`               | `text-muted-foreground`                               |
| `border-ft-line-soft`, `border-ft-line`      | `border-foreground/10` (soft) / `border-border` (crisp) |
| `bg-ft-ember`, `text-ft-ember`, `border-ft-ember` | `bg-primary`, `text-primary-foreground`, `border-primary` |
| `bg-ft-spark`                                | `bg-accent` (hover/highlight)                         |
| `text-ft-ok`, `bg-ft-ok`                     | no theme equivalent yet — keep `text-ft-ok` until a `--success` var lands |

#### Warm-ink ramp (dark editorial surfaces)

The dark race screen, dark TopBar/footer, popovers, and editorial dark panels share a warm-toned ink palette. Use these tokens — never inline the hex.

| Token                  | Hex      | Use                                              |
|------------------------|----------|--------------------------------------------------|
| `bg-ft-ink-deep`       | `#0A0A09`| Deepest surface — passage bg on the race screen. |
| `bg-ft-ink-track`      | `#1A1815`| Track / slot bg (race lane).                     |
| `bg-ft-ink-popover`    | `#3A3833`| Dark popover detail (e.g. unread dot bg).        |
| `border-ft-ink-line`   | `#221F1A`| Hairline on dark surfaces.                       |
| `bg-ft-paper-soft`     | `#FAF7F0`| Warmer paper than `bg-ft-paper` — error/404 panels, supporter card. |
| `text-ft-warm-1`       | `#B5AF9F`| Brightest warm-dim text on ink.                  |
| `text-ft-warm-2`       | `#9C978A`| Mid warm-dim text on ink.                        |
| `text-ft-warm-3`       | `#6E695F`| Deeper warm-dim text on ink.                     |
| `text-ft-warm-4`       | `#5C5950`| Deepest warm-dim text on ink — passage chars not yet typed. |

These are part of the §2.3 fixed layer — they do not swap with `<ModeToggle>` / `<ThemeSwitcher>`. Reach for them only on surfaces that are *intentionally* dark regardless of the user's palette.

#### User-tag tokens

Identity marks (OWNER, WHITE HAT, OG, …) paint from a per-tag token quartet that is **100% fixed across palettes AND modes**. A "founding member" or "owner" chip is a claim about the user, not chrome — themed-coral OG under one palette and themed-mint OG under another would let the tag drift across users and stop reading as a *kind*. Each tag's four-token quartet has identical values in `:root` and `.dark`; there are no per-mode overrides. Fills are **solid opaque** so the chip carries its own contrast regardless of the surface behind it (dark race screens, light profile pages, every palette).

The warm/cool axis is load-bearing: OG and OWNER are *warm* (copper-cream, amber-gold), WHITE HAT is deliberately *cool* (slate-blue ink on pale silver) so the three read as distinct kinds at a glance. Keep new tags low-chroma — a tag is quiet ink, never a second coral spark (§2).

| Token                       | Use                                                            |
|-----------------------------|-----------------------------------------------------------------|
| `--ft-tag-og-fg`            | OG icon + label colour (aged-copper ink)                       |
| `--ft-tag-og-border`        | OG hairline border                                             |
| `--ft-tag-og-fill`          | OG opaque warm-cream fill                                      |
| `--ft-tag-og-glow`          | OG outer + inset box-shadow (static, no animation)             |
| `--ft-tag-owner-fg`         | OWNER icon + label colour (deep brown for max contrast on gold) |
| `--ft-tag-owner-border`     | OWNER hairline border                                          |
| `--ft-tag-owner-fill`       | OWNER opaque amber-gold fill                                   |
| `--ft-tag-owner-glow`       | OWNER outer halo + inner highlight (signet-press feel)         |
| `--ft-tag-whitehat-fg`      | WHITE HAT icon + label colour (deep cool slate-blue ink)       |
| `--ft-tag-whitehat-border`  | WHITE HAT hairline border (mid cool slate)                     |
| `--ft-tag-whitehat-fill`    | WHITE HAT opaque pale cool-silver fill (lightest of the three) |
| `--ft-tag-whitehat-glow`    | WHITE HAT quiet cool halo + polished top-edge highlight        |

Only `<UserTag>` (§11) consumes these — never reach for them from product surfaces. Adding a new tag requires extending the per-tag token quartet, the `UserTagId` union (`src/types/user-tag.ts`), the catalog in `src/components/ft/user-tag.tsx`, and the rows in §11 + §14 of this doc, all in the same commit.

#### Third-party brand tokens

Third-party brand colours are fixed identity assets — they don't get themed. Every entry must be tied to a brand-mark surface (an OAuth button, a partner chip, an integration badge); never reach for these as generic accents.

| Token                            | Hex      | Use                                                              |
|----------------------------------|----------|------------------------------------------------------------------|
| `bg-ft-brand-discord`            | `#5865F2`| Discord OAuth button fill (`<DiscordButton>`).                   |
| `bg-ft-brand-discord-hover`      | `#4752C4`| Hover/active state on the Discord OAuth button.                  |

If you add a new third-party brand surface, register the token in `globals.css` under the brand-tokens block and add a row here in the same commit.

---

## 3. Spacing

Tailwind's default numeric scale only. Allowed step values: `0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20`. No arbitrary values (`p-[13px]`).

Values are **mobile-first** — unprefixed classes target ≤ 375px viewports; `sm:` / `md:` / `lg:` overrides scale up. Never set a large base and shrink it down with a prefix. See §11.

| Context                   | Class                      |
|---------------------------|----------------------------|
| Tight stack (button row)  | `gap-2`                    |
| Card contents / row       | `gap-3`                    |
| Between sections          | `gap-6 sm:gap-8`           |
| Page-level section gap    | `gap-8 sm:gap-10`          |
| Card padding              | `p-4 sm:p-5`               |
| Code-block padding        | `p-3`                      |
| Inline code padding       | `px-1 py-0.5`              |
| Input padding             | `px-3 py-2`                |
| Topbar vertical padding   | `py-3 sm:py-4`             |
| Page horizontal padding   | `px-4 sm:px-8`             |
| Page vertical padding     | `py-10 sm:py-20`           |
| Notch / status bar inset  | `safe-pt` (utility)        |
| Home-indicator inset      | `safe-pb` (utility)        |
| Landscape edge inset      | `safe-pl` / `safe-pr` / `safe-px` (utility — body already applies `safe-px` globally) |

`safe-*` are project-defined Tailwind v4 utilities (`@utility` in `globals.css`) that map to `env(safe-area-inset-*)`. They activate via `viewport.viewportFit = "cover"` in `src/app/layout.tsx`. Apply `safe-pt` to the topmost sticky chrome and `safe-pb` to the bottommost chrome on any surface that runs full-bleed on iOS/Android.

---

## 4. Typography

**Plus Jakarta Sans for the interface, IBM Plex Mono for code, keycaps and the optional mono passage.** Both load via `next/font/google` in `src/app/layout.tsx` (`--font-sans`, `--font-mono`); Lora is shipped only as the passage's optional "Serif" family. Tabular numerics on every stat (`tabular-nums`). The passage font is the user's choice (Settings → Typography) and never leaks into chrome.

Chrome text (nav, buttons, menus, footer) is **13–14px sentence case, `font-medium`**. Meta text is 12px muted. The rows below that still name `ft-*` colours predate the theme-aware layer — use the §2.2 semantic equivalents for new work.

| Role                  | Class                                                                                  |
|-----------------------|----------------------------------------------------------------------------------------|
| Display (hero h1)     | `text-5xl font-extrabold leading-[0.92] tracking-[-0.04em] text-ft-ink sm:text-7xl lg:text-[124px]` |
| H1 (page title)       | `text-3xl font-extrabold tracking-tight text-ft-ink sm:text-5xl lg:text-6xl`           |
| H2 (section)          | `text-2xl font-bold tracking-tight text-ft-ink sm:text-3xl lg:text-[44px]`             |
| H3 (card title)       | `text-2xl font-bold tracking-tight text-ft-ink sm:text-3xl lg:text-4xl`                |
| Body                  | `text-sm leading-relaxed text-ft-dim-2 sm:text-base`                                   |
| Body strong           | `text-ft-ink font-semibold`                                                            |
| Eyebrow / tag         | `text-[10px] font-medium uppercase tracking-[0.18em] text-ft-dim` — also via `<Tag>`   |
| Nav link              | `text-[11px] uppercase tracking-[0.14em] text-ft-dim-2`                                |
| Stat value (md)       | `text-[22px] font-semibold tracking-[-0.02em] tabular-nums text-ft-ink` — via `<Stat>` |
| Stat value (lg)       | `text-4xl font-bold tracking-[-0.04em] tabular-nums`                                   |
| Small / caption       | `text-[11px] text-ft-dim`                                                              |
| Code (passage word)   | `text-2xl leading-[1.7] text-ft-dim sm:text-[26px]` — passage uses dim → ink as cursor advances |
| Inline code           | `bg-ft-ink/10 px-1.5 py-0.5 text-xs text-ft-ink`                                       |
| Error text (form)     | `text-sm text-destructive` with `role="alert"` (an error is not the brand spark; orange stays for primary/selected). |
| Form label            | `text-xs font-medium text-foreground`, sentence case, above the input (auth `<Field>` / `<PasswordField>`). No uppercase tracked labels on forms. |
| Reading-page h2       | `text-lg font-semibold tracking-tight text-foreground sm:text-xl` — via `<EditorialSection>` (slug id from the title + `scroll-mt-24`). One h2 style for every reading page. |
| Reading-page body     | `text-[15px] leading-7 text-foreground/85 sm:text-base` — via `<EditorialSection>`; inline links via `<EditorialLink>` (`underline decoration-primary/40 underline-offset-4 hover:text-primary`). |
| Error word (passage)  | `text-ft-ember underline decoration-ft-ember underline-offset-[6px] decoration-1` The underline sits on the word's own inline-block (`PastErrorWord`), never on the outer word span: a text decoration doesn't reach into an inline-block, so on the outer span it underlined only the trailing space. |
| Error letter (active word, passage) | `text-[var(--ft-passage-error,var(--destructive))]` plus one of four stacked cues, controlled by `appearance.mistakeStyle` (Customise → Appearance → Mistakes): `color` (hue only — quietest), `bold` (`font-bold` — default; mono is width-stable so caret unaffected), `underline` (`underline decoration-2 underline-offset-[6px]`), `highlight` (`rounded-sm font-bold` + inline `bg-[color-mix(in oklch, var(--ft-passage-error,var(--destructive)) 20%, transparent)]` — loudest, prior shipping default but read as too strong). Past errored words use the underline row above; this is the equivalent (configurable) cue for in-progress mistakes. |
| Result hero (speed)   | `text-6xl font-bold tracking-[-0.04em] text-primary sm:text-7xl` — the one orange number on the result screen. |
| Result lead (accuracy) | `text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl` |
| Result detail         | `text-xl font-semibold tracking-tight text-foreground sm:text-2xl` with the label above in `text-xs font-medium text-muted-foreground` (sentence case) — raw, consistency, errors, time, run shape. |
| Live readout          | `<Readout>` (`src/app/_components/readout.tsx`): value `text-xl font-semibold tabular-nums` (speed: `text-3xl font-bold text-primary`) followed by a lowercase unit caption in `text-xs text-muted-foreground` ("84 wpm", "97% acc"). Mobile uses `compact` (`text-base` + `text-[11px]`). |
| Verdict hero (insights) | `text-5xl font-bold tracking-[-0.03em] text-foreground` (proportional figures: a lone hero number reads better without tabular spacing), with the unit in `text-xl font-semibold text-muted-foreground`. Ink, never orange: the orange on `/insights` belongs to the action. |
| Finding lead | `text-sm font-medium text-foreground`, with the follow-up in `text-sm text-muted-foreground`. One idea per sentence, ≤ 20 words. |

**Tracking conventions** (load-bearing — these signal mode):
- `tracking-[0.18em]` uppercase = label / tag (smallest, most spaced).
- `tracking-[0.14em]` uppercase = nav link.
- `tracking-[0.06em]` regular case = secondary metadata.
- `tracking-[-0.02em]` to `tracking-[-0.04em]` = display weight (tight).

---

## 5. Layout recipes

All recipes are **mobile-first**: base classes target ≤ 375px viewports, `sm:` and up add desktop-only expansion. See §11 for the rule.

| Recipe                    | Class                                                                                          |
|---------------------------|------------------------------------------------------------------------------------------------|
| App page                  | `<PageShell>` + `<PageHeader>` + `<PageSection>` from `@/components/page-shell` — one centred column (`max-w-6xl` app pages, `max-w-2xl` reading pages), `gap-10 sm:gap-12` between sections, `pb-24` so the friends dock never covers the last row. No hero cards: the header is an h1, one muted line and an `aside` slot. The horizontal gutter comes from `<AppChrome>` (`px-4 sm:px-6`, the same as the top bar and footer) so every edge lines up. The `<PageHeader>` h1 is `text-balance`, so a long title never leaves one word on its own line. |
| Card                      | `<Surface>` (`rounded-2xl border border-border bg-card shadow-card`) — only for things the user acts on (a list of rows, a tile, a form). Sections themselves are never boxed. |
| Two-up row                | `grid gap-10 lg:grid-cols-2 lg:gap-x-12` — no vertical rules, so column edges line up down the page. |
| Two-up cards              | `grid gap-4 lg:grid-cols-2 lg:gap-6` when both columns are `<Surface>` cards (charts, lists of rows). The cards' own borders separate them, so the gap is tighter than a two-up of bare columns. Use one template per page so column edges line up; add `lg:items-start` when content heights differ a lot, otherwise let them stretch and make a chart fill its card. When one side has no data, the other spans both columns (`lg:col-span-2`) and the missing one becomes a single muted line underneath — never a half-empty card. |
| Practice column           | `mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col` with no horizontal padding (`<AppChrome>` owns the gutter). Mode bar, readouts, passage, keyboard and the result screen all sit in it, so no edge moves between rest, typing and results. |
| Shared result page | `<PageShell width="text">` → `<PageHeader eyebrow="Shared result" title="Can you beat @handle?">`, with the handle in a `[overflow-wrap:anywhere]` span so a long handle wraps instead of overflowing. Then the fixed dark result card (`rounded-2xl bg-ft-ink-deep ring-1 ring-ft-ink-line shadow-float`, one orange WPM, ink figures). Identity tags sit beside the handle pill and wrap onto their own line, never inside the pill, so the handle keeps its room. Then a `lg` primary "Take the test" + `lg` outline "View profile", full width on mobile and left-aligned with the column from sm. |
| Fixed-size asset page (/card) | Theme-aware page with a header row: h1 + one line + a primary `lg` "Download PNG" (the page's one orange action). Below it, `<CardStage>`: a `w-full overflow-hidden rounded-2xl` frame with the card's `aspect-ratio` and `max-width`, so the final box is reserved from the first paint (no sideways scroll or shift before hydration). The card scales down with a transform on an inner wrapper and stays hidden until it has been measured; the PNG export still renders at natural size. The header row and the stage share `maxWidth: min(<natural width>px, calc((100dvh - 12rem) * W / H))`, so header plus card fit one screen on short laptops (no scroll at 1440×900 or 1280×720) and the Download button stays flush with the card's right edge. |
| Capped list (long chip/table lists) | Show the first N (about 10 rows / 40 chips), then an outline `size="sm"` "Show all N" / "Show fewer" toggle, `h-11 self-start sm:h-8`. Internal identifiers (hashes, raw codes) go behind a `<details>` "Technical details" disclosure, never inline. Status pills in a page header stay neutral (`rounded-pill border bg-card`, `bg-ft-ok` dot when healthy), and the same status isn't repeated as an orange tile. |
| Filter toolbar | One row under the `<PageHeader>`. On md+: the view `<SegmentedControl>`, then the filter switches, then icon-only actions pushed right with `ml-auto`. Selects are outline buttons (`<Button variant="outline">`) that open a `<DropdownMenu>` of `DropdownMenuCheckboxItem`s; the selected item gets an orange check and orange text. When a select's value differs from its default, its trigger is tinted (`border-primary/40 bg-primary/[0.06]`, orange icon, `font-semibold text-primary` label), so you can see which dropdowns are shaping the view. Icon actions use `variant="outline" size="icon"` at `size-11 md:size-10`, with a tooltip and `aria-label`, and are marked `data-no-export`. Every control is 44px on phones and 40px from md (`h-11 md:h-10`). Switches put the touch target on the segments: on phones a `p-0.5` track with 40px segments (`[&>button]:h-10 [&>button]:py-0`, the §17.2 recipe, about 46px overall, also used in the filter sheet); from md an `h-10 p-1` track with `[&>button]:h-full` segments (`TOOLBAR_SWITCH`). On phones: row 1 is the view switch (`flex-1`) plus the actions; row 2 is one full-width outline button that shows the current filters ("Casual · 60s · All time") and opens a `<MobileSheet>` of full-width segmented switches with a sticky Done button. The actions render once per breakpoint (`md:hidden` / `hidden md:flex`, state lifted to the parent), so DOM order matches visual order and Tab walks left to right at every width. Never move a control visually with `order-*`. Filter state lives in the URL with defaults left out. Filters that need sign-in (Friends) resolve to their signed-out fallback once auth has loaded, so the summary, the board and the empty message agree. Used by `/leaderboard`. Rationale: one visible row shows which board you're looking at; the old 18-item rail hid the active filter below the fold. |
| Ranked table | `<Surface className="overflow-hidden">` with a header row and `divide-y divide-border/60` rows that share one grid template: `grid-cols-[2rem_minmax(0,1fr)_auto]` on phones, `md:grid-cols-[2.5rem_minmax(0,1fr)_8rem_4.5rem_4.5rem_4.5rem]` from md. Phones show rank, player (plus one muted summary line) and the headline number; md adds three detail columns (the first left-aligned, the two numeric ones right-aligned and muted). Never spend a column on a value every row shares: a board pinned to one length shows "When" (relative date) there instead. Ranks 1–3 get a small `rounded-full size-7` medallion: 1st is `brand-surface text-primary-foreground`, 2nd and 3rd are neutral `bg-muted text-foreground`. Other ranks are muted ink. The viewer's best row (one row only) gets `bg-primary/[0.07]`, a `w-1` orange left bar, an orange handle and a filled `brand-surface text-primary-foreground text-xs font-semibold rounded-pill` "You" pill. The viewer's other rows get only the orange handle. Headline numbers always stay ink. Categorical cells (length, tier) are neutral `bg-muted text-muted-foreground` pills. Counts use `toLocaleString()`. Loading shows skeleton rows in the same grid. Errors with no rows show the message plus an outline "Try again". A failed refresh over visible rows, or a failed export, shows a one-line `text-sm text-destructive` notice under the toolbar with a "Try again" link (`data-no-export`). Empty: the §17.3 dashed card names the active filters and offers one button that widens them ("Show all lengths", then "Show all time", then "Show everyone", then the other mode, e.g. "Show Adapt runs"). Empty and error buttons are `h-11 w-full sm:h-9 sm:w-auto`, stacked on phones. Rationale: one shared template keeps every view's columns aligned, and orange marks only you and the leader, so a viewer with many rows doesn't turn the table orange. |
| Inline row (desktop-only) | `flex items-center gap-3`                                                                      |
| Stacked row → inline      | `flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3`                                     |
| Button group (wrappable)  | `flex flex-wrap gap-2`                                                                         |
| Topbar (sticky header)    | `sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80` |
| Topbar inner row          | `mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-8 sm:py-4`          |
| List row (long text + action) | `flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between` |
| App shell with sidebar | Settings only (`src/app/customise/layout.tsx`): one scroller (`data-customise-scroller`, `overflow-x-clip overflow-y-auto`, inside AppChrome's gutter) holding a centred grid `mx-auto max-w-5xl lg:grid-cols-[var(--app-rail-width)_minmax(0,1fr)] lg:gap-12`. The sidebar column is `sticky top-0` (lg+); the page column is `pt-6 pb-28 sm:pt-8`. Below lg a sticky header (`bg-background/85 backdrop-blur-md`) carries the page picker and a search icon, with no negative margins (they pushed the scroller 8px wide on phones). `<ScrollReset>` sets the scroller to the top on every page change unless the URL has a hash. Rationale: one scroller means the wheel works anywhere, the sidebar never scrolls away, and every page opens at its h1. |
| Top bar                   | `<TopBar>`: a `[1fr auto 1fr]` grid — logo left, the nav as a floating pill capsule centred (lg+; active route is a filled brand-orange pill), actions pinned to column 3 so they always hug the right edge. 64px tall, translucent over the page aura. |
| Footer                    | `<AppFooter>`: in-flow at the end of scrolling pages (scrolls away with content); pinned only under `compact` surfaces at md+. 12px sentence case; the version links to `/changelog`. On phones each footer link is a 44px row (`inline-flex min-h-11 items-center sm:min-h-0`), with footer padding `py-1 sm:py-4` and no row gap below `sm`. The version link uses `gap-1` (a flex row collapses the space). |
| Auth centered card | `<AuthShell>` (`/sign-in`, `/sign-up`): `flex min-h-dvh items-center justify-center px-4 py-10` (on an inner wrapper, since `safe-pt safe-pb` on main set their own padding) over the page aura, a `w-full max-w-md` column, one `rounded-2xl border border-border bg-card shadow-card` card holding only the flame logo and the form. **Each step renders its own heading** through `<AuthStep title description>` (`src/components/auth/auth-step.tsx`: centred `text-2xl font-bold text-balance sm:text-3xl` h1 + one muted line), so a step is never headed by another step's copy ("Check your email", "Reset your password", "Choose a new password", "One more step"). An email inside copy uses `<EmailText>` (`wrap-anywhere`, never `break-all`); later sign-in steps show it in a `rounded-xl bg-muted/60` inset block ("Signing in as" + a ghost h-9 `Change` button on top, the email on its own line). Fields are 44px (`h-11 sm:h-10`) with placeholders; passwords use `<PasswordField>` (Eye/EyeOff reveal, `aria-pressed`); a new-password hint comes from the Clerk instance's own minimum (`usePasswordHint`), never a hard-coded number. Six-digit codes use `<OtpField>` with flexing slots (`size-11 max-w-12 min-w-0 flex-1`, group `gap-1.5 sm:gap-3`) so six fit a 375px card. The submit is `<Button size="lg">`, the card's one orange CTA; `<DiscordButton>` stays brand blurple on the `secondary` variant. Method-picker rows are outline `lg` buttons with icon + label, no trailing chevron. Under the card: the alt-link sentence (link `font-semibold text-primary`) and "Keep practising without an account", underlined at rest (`text-foreground/80 underline decoration-border hover:decoration-primary`) so it reads as a link on touch. Card animates in with `animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500 motion-reduce:animate-none`. `/sign-in/sso-callback` passes explicit `signInUrl`/`signUpUrl`/fallback URLs so a stale round-trip lands on our pages; `/sign-in/verify` without Clerk's `__clerk_status`/`__clerk_ticket` params shows the error state, never a success. It verifies only once Clerk has loaded, because before that Clerk queues the call and resolves at once. So an expired, failed or wrong-device link shows its own error. A link that signed in this browser says "You're signed in" and moves on. A link verified elsewhere says to go back to the tab that started sign-in (`verify-status.ts`, tested). |
| Human check (Clerk Protect) | When Clerk answers a sign-up step with `protect_check`, the form runs the challenge itself: `runProtectCheck` (`src/components/auth/protect-check.ts`, tested) loads Clerk's `sdkUrl` module, mounts its widget, submits the proof, and handles expiry, reissue and already-resolved. `useProtectCheck` + `<ProtectSlot>` (`use-protect-check.tsx`) place it just above the submit button: out of the flow (`absolute h-0 overflow-hidden`) until Clerk asks to show the widget, then a one-line prompt ("One quick check: tick the box to show you're human.") over the 300px widget, which may spill into the card's side padding on phones (`-mx-4 sm:mx-0`). The submit reads "Checking…" / "Waiting for the check…" meanwhile; failures show plain `text-destructive` copy (`protectCheckMessage`). A Discord round-trip that still owes the check returns to `/sign-up#/protect-check`, which shows the "One more step" card. Rationale: with Protect on, the custom form otherwise dead-ends after the email code. |
| Reading page              | `<EditorialPage>` (`src/app/_components/editorial-page.tsx`) inside `<AppChrome>`: `<PageShell width="text">` + `<PageHeader>` (eyebrow, h1 without a trailing period, one line), an optional `toc` jump list of outline pills (`h-11 sm:h-9 rounded-pill border bg-card`, orange on hover/focus), then `<EditorialSection>`s separated by `gap-10 sm:gap-12`, and an optional footer above a hairline. Used by About, FAQ, Privacy, Terms, Blog, Changelog. On phones the `toc` jump list is a single sideways-scrolling row (`-mx-4 px-4 overflow-x-auto`, hidden scrollbar, `shrink-0` pills); from `sm` it wraps. |
| Error / 404 screen        | `<ErrorScreen>` (`src/app/_components/error-screen.tsx`): theme tokens only (must read in dark mode and every palette). A decorative flame-gradient code, one h1, one line, the primary action as an orange `<Link className={buttonVariants({ size: "lg" })}>` (never a button inside an anchor), a secondary outline action (default "Search pages", which opens the Cmd/Ctrl+K palette and shows ⌘ or Ctrl by platform), and a frozen passage card (`<Surface>`). No arrows in labels. The 404 renders inside `<AppChrome>`; `error.tsx` renders standalone with only the logo, since the crash may come from the chrome. The passage card's caret is a solid `bg-primary` bar at a word boundary: no blink (§13.1), and a caret mid-word reads as a typo. |
| Minute bar | `<MinuteBar>`: `h-3 rounded-full overflow-hidden flex gap-0.5 bg-card`. Segments in fixed order (typing, fixing, pauses before words, hesitations inside words, breaks) on an ordinal ink ramp, `foreground/85`, `/72`, `/60`, `/47` and `/35` (`SLICE_FILL`, `src/components/analysis/budget-segments.ts`), each matching its `<BudgetTable>` swatch; the one focus slice is `bg-primary`. Every slice the table shows as more than "0 s" is at least 2% wide; a slice under 0.05 s draws no segment, so the bar and the table never disagree (`budgetSegments`, tested). The ramp passes the dataviz ordinal checks against `--card` in light and dark (adjacent ΔL ≥ 0.06, lightest step ≥ 2:1). The figure is `aria-hidden`; the table beside it is always visible and is the accessible version. From md a transparent hit layer taller than the bar names each segment in a tooltip ("Typing, 44 s"). Rationale: an ink ramp keeps data ink, lets every segment be matched to its row without hover, and leaves orange for the one slice the page's action targets. |
| Budget table | `<BudgetTable>`: a `<table>` with row headers (swatch, label, a muted clause on its own line, `sr-only` when `clauses={false}`) and value columns in `text-sm font-semibold tabular-nums`. Labels and clauses come from `SLICE_LABEL`, `SLICE_CLAUSE`, `breakClause` and `fixingClause` (`src/lib/format-figure.ts`). The Breaks clause names the run's real threshold through `breakSeconds` ("Stops of 3.4 seconds or more, …"; one decimal at any size, exactly "2 seconds" at the floor), so it never misstates which stops count as breaks. |
| Range track | `<RangeTrack>`: an `h-1.5 rounded-full bg-muted` track, a `bg-foreground/20` band, a `size-3` ink dot with `ring-2 ring-card`, labelled ends in `text-xs tabular-nums`, and `role="img"` with a sentence label. A band narrower than about a third of the track gets one label ("Between 77 wpm and 81 wpm", from `rangeText`; never "… to …", which would read "97.6% to 98.3%" for accuracy) instead of two, so labels never collide. When both ends read alike ("100%"), it gets one label, never the same figure twice (`rangeGeometry` in `track-geometry.ts`, tested). For "is this normal for me?". |
| Comparison track | `<ComparisonTrack>` (`w-full max-w-md`, so captions stay near their dots on wide rows): two `size-3` dots with `ring-2 ring-card` (better days `bg-foreground/40` over an opaque `bg-card` disc, so the segment never shows through; recently `bg-foreground`), joined by a `bg-foreground/20` segment on an `h-1.5 bg-muted` track, scaled to at least 1.25 × the higher value. Under the track a flex row (`justify-between gap-4`) holds the two captions in the dots' order: the lower value's at the left end, the higher's at the right end. Each caption has a swatch matching its dot, a muted label and the value in `text-xs font-semibold tabular-nums`. A long caption wraps, so captions never collide whatever `format` returns. `role="img"` with a sentence label. |
| Field list | `<FieldList>`: a `<dl>` of label and value (`dt` muted, `dd` `font-semibold tabular-nums`), inline (`flex flex-wrap gap-x-4 gap-y-1`, value read first, `dt` first in the DOM) or stacked (label above value). `size="sm"` is `text-xs`. Replaces every dot-joined metadata line. |
| Question row | `<QuestionRow>`: question (muted `text-sm`), answer (`text-base font-semibold`), evidence (`text-sm`), and a "How we know" disclosure. |
| Change row | `<ChangeRow>`: `grid-cols-[auto_minmax(0,1fr)_auto]`, an ink direction icon, title over detail, and a `<SlopeGlyph>` (a 40×16 sketch: a translucent before dot, an ink after dot, and a line that starts at the before dot's edge). The icon and the sketch both show the verdict, not the raw direction: better is `ArrowUpRight` with a rising sketch and worse is `ArrowDownRight` with a falling one, whichever way the value moved, so "Less time fixing mistakes." rises. The sketch takes the row's `direction`, so the two always agree (`slopeGeometry` in `track-geometry.ts`, tested). The detail keeps the literal figures ("About 5.2 seconds a minute, down from 9.3."). Rationale: without colour, one shape for every improvement makes the list scannable across mixed metrics. |
| Method disclosure | `<MethodDisclosure>`: a native `<details>` (`data-no-export`) with summary "How we measure this" (`min-h-11 sm:min-h-0`, offset focus outline) and a body of 2–4 plain sentences naming the method and one caveat. |
| Labelled progress | `<LabelledProgress>` (base-ui Progress, `src/components/ui/progress.tsx`): an `h-2` track with an ink `bg-foreground/60` fill (`brand-surface` only when it is the view's one focus item), start and end labels in `text-xs` under the bar (the start label is its accessible name), one caption, and `aria-valuetext`. Replaces "N% to X" and "N / M" progress sentences. A plain bar uses `<Progress>` (ink indicator, `aria-label` and `aria-valuetext`). |
| Key hint | `<KeyHint>`: `<Kbd>` plus a label. Groups are spaced `gap-x-4`, never joined by a glyph. |
| Status text | `<StatusText>`: a `size-1.5` dot and text, no border, no fill. Tones: `ok` (`bg-ft-ok`), `learning` (`bg-muted-foreground/50`), `live` (`bg-primary motion-safe:animate-pulse`, for a live race state only). Replaces status pills ("Warm", "Race in progress"). |

---

## 6. Component structure

### 6.1 Server Components by default
`'use client'` only when a component uses `useState`, `useEffect`, refs, browser APIs, or `useBackend()`.

### 6.2 Props
- Explicitly typed (no `props: any`, no unannotated destructure).
- Structural props come from `src/types/` when they match a domain concept; otherwise declare a named type in the file.

### 6.3 Async action feedback — three states, always visible

Every async action surfaces three states in the UI:
- **Loading** — disable the trigger; change its label (e.g. `Save` → `Saving…`).
- **Success** — reset the form, render the returned data, or show a confirmation.
- **Error** — render a visible message using the error text role from §4 (add the role if not yet defined), preferably including `BackendError.code`.

This is a structural rule. The *visual* (classes) lives in §§2–5 per application.

---

## 7. Accessibility baseline

- Every `<input>` has an associated `<label>` or `aria-label`.
- Icon-only buttons have `aria-label`.
- Don't override the keyboard behavior shadcn primitives ship with.
- **Modal focus.** `<ConfirmDialog>`, `<MobileSheet>` and the friends dock's desktop panel manage keyboard focus through `useFocusTrap` (`src/lib/use-focus-trap.ts`; logic in `src/lib/focus-trap.ts` and `src/lib/tabbable.ts`, both tested). Opening moves focus inside: a control the caller already focused or marked `data-autofocus`, else the first control (Cancel is the confirm dialog's fallback), else the panel. On touch devices (`pointer: coarse`) focus goes to the panel itself, so no on-screen keyboard or stray focus ring appears. Tab and Shift+Tab wrap inside. Escape closes only the topmost overlay. Closing returns focus to the opener: a menu item's menu trigger, or the nearest remaining control when the action removed the opener. The backdrop and grab handle are pointer-only (`tabIndex={-1}`), and the closing panel is `inert`. The body scroll lock is counted (`lockBodyScroll`, `src/lib/scroll-lock.ts`) and shared by every overlay, the `<MobileNav>` drawer included, so a sheet handing off to a dialog, or an overlay that overlaps the drawer, unlocks correctly. An Escape that an overlay on top already handled (defaultPrevented) never also closes the one below. The Adaptive explainer modal (`adapt-modal.tsx`) uses the same counted lock, and the notifications bell closes the drawer (`closeMobileNav()`) before its popover opens. A new overlay reuses the hook instead of hand-rolling a trap. Rationale: these overlays set `aria-modal` but used to let Tab escape to the page and left focus behind on close.
- Never rely on color alone to convey state — pair with icon or text.
- **Touch targets ≥ 44×44 px** on any viewport a phone might load (i.e. unconditionally). Use shadcn `Button` `size="default"` (`h-9` + horizontal padding clears the finger target on mobile once it's the full-width stacked CTA; on dense inline toolbars, keep `size="sm"` but reserve those for secondary actions, not primary CTAs). Icon-only buttons set `size="icon"` and override to `h-11 w-11` on mobile (`h-11 w-11 sm:h-9 sm:w-9` if you want them compact on desktop).
- A control that must stay visually small (a 32–36px pill in a dense strip, an icon inside a field, a dialog close) keeps its size and adds `touch-hit` (globals.css): on touch screens an invisible `::after` grows its tap area to at least 44×44 around its centre. Pair it with `relative` unless the element is already `absolute`. Used by top-bar Sign in, Discord Join and dismiss, the password reveal and the dialog close. Rationale: a finger-sized target without a taller pill in a slim strip.
- Dropdown menu items (`DropdownMenuItem` and `DropdownMenuCheckboxItem`) are `min-h-11` on phones and compact from `sm` (`sm:min-h-0`). The shared dialog close is a 32px ghost pill (`size-8 touch-hit`, right-2 top-2). The `<MobileSheet>` close is `size-11` with `-my-1 -mr-2`, so the header keeps its height.

---

## 8. Backend integration

Every component that calls the backend uses `useBackend()`. See `docs/backend-rules.md` → "Calling from the client" for the mechanics.

### 8.1 Canonical fetch-and-render pattern (structure, not styling)

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BackendError, useBackend } from '@/lib/backend';
import type { User } from '@/types/user';

export function UsersList() {
  const backend = useBackend();
  const [data, setData] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setData(await backend.users.list());
    } catch (err) {
      if (err instanceof BackendError && err.code === 'UNAUTHORIZED') {
        setError('Please sign in.');
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section className={/* card recipe — see §5 */ ''}>
      <div className={/* row recipe — see §5 */ ''}>
        <span className={/* eyebrow — see §4 */ ''}>users</span>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {error && <p className={/* error text — see §4 */ ''}>{error}</p>}

      {data?.map((u) => (
        <div key={u.id} className={/* body text — see §4 */ ''}>
          {u.name}
        </div>
      ))}
    </section>
  );
}
```

Structure is fixed (hooks, three states, typed error branching, types from `@/types/*`). Visual classes come from §§2–5 once defined per application.

### 8.2 Typed error branching (preferred over string matching)

```tsx
catch (err) {
  if (err instanceof BackendError) {
    switch (err.code) {
      case 'UNAUTHORIZED': signIn(); return;
      case 'FORBIDDEN':    setError("You don't have access."); return;
      case 'NOT_FOUND':    setError('Gone.'); return;
      case 'VALIDATION':   setError(err.message); return;  // field issues in err.details.issues
      default:             setError(err.message);
    }
  } else {
    throw err;   // let the error boundary handle it
  }
}
```

### 8.3 When throw feels noisy — use `safe()`

```tsx
import { safe } from '@/lib/safe';

const r = await safe(backend.users.get({ id }));
if (!r.ok) { /* branch on r.error.code */ return; }
/* render r.data */
```

Pick one style per call site — don't mix.

### 8.4 Non-auth headers once, outside render

Clerk's session cookie handles auth automatically — `setBackendHeaders` is only for cross-cutting non-auth headers (tenant id, trace id, feature flags, i18n locale). Wire them up once at app init or when the relevant state changes:

```tsx
useEffect(() => {
  setBackendHeaders(() => ({
    'x-tenant-id': currentTenant.id,
  }));
}, [currentTenant.id]);
```

Never call `setBackendHeaders` inside render (no effect guard would cause a render loop).

---

## 9. Theming

Two independent axes:

- **Palette** — `<ThemeSwitcher>` puts a `theme-<id>` class on `<html>`. Each class is a block of CSS variables in `src/app/themes.css`. The `default` theme uses `:root` / `.dark` from `globals.css` and sets no extra class. Palette dark variants live at `html.dark.theme-<id>` (both classes required). The `html` tag prefix is load-bearing — `themes.css` is imported before `:root` in `globals.css`, so plain class selectors would lose the tie-break to `:root`; `html.theme-<id>` raises specificity from (0,0,1,0) to (0,0,1,1).
- **Mode (light/dark)** — `<ModeToggle>` toggles the `dark` class on `<html>`. `:root` / `.dark` handle the default palette; every community palette ships a `html.dark.theme-<id>` block too. If nothing is stored, the initial mode resolves from `prefers-color-scheme`.

Ships with a selection of community palettes sourced from [tweakcn.com](https://tweakcn.com) — currently Amethyst Haze, Bold Tech, Bubblegum, Catppuccin, Claymorphism, Cosmic Night, Cyberpunk, Kodama Grove, Light Green, Tangerine, Twitter. Registered in `src/lib/themes/themes.json` and loaded via `src/lib/themes/registry.ts` → `THEMES`. Add more with `yarn themes:add <tweakcn-url>`.

### 9.1 What swaps, what doesn't
- Theme-aware semantic classes (§2, layer 1) swap automatically.
- Fixed zinc literals (§2, layer 2 — the table) do not swap by design — they stay neutral under every theme.

### 9.2 Adding a theme
1. Fetch `https://tweakcn.com/r/themes/<slug>.json`.
2. Copy `cssVars.light` into `html.theme-<slug> { ... }` and `cssVars.dark` into `html.dark.theme-<slug> { ... }` in `src/app/themes.css`. Keep the `html` prefix — it wins the specificity tie against `:root`.
3. Register the id + label in `src/lib/themes.ts` `THEMES`.
4. **De-saturate the accent.** tweakcn frequently ships a saturated `--accent`/`--accent-foreground` (a second loud colour). Per §2.1, `--accent` is the quiet hover tint, never a spark — if the palette's accent has meaningful chroma, drop it to a low-chroma neutral lift/dim before pasting (or alias it to `--muted`). A loud accent makes every list/menu hover fight `--primary`.
5. All four changes land in one commit — same commit that introduces any UI using the new theme.

### 9.3 FOUC prevention
`src/app/layout.tsx` injects `THEME_BOOTSTRAP_SCRIPT` from `@/lib/themes` into `<head>` so **both** the theme class and the `dark` class are applied synchronously before React hydrates. Never skip this — the flash of default-then-themed or light-then-dark is visibly ugly. `<html>` has `suppressHydrationWarning` because the server renders without these classes and the bootstrap script adds them client-side.

---

## 10. Mobile-first

**Mandate.** Every UI in this repo is designed **mobile-first**. Unprefixed Tailwind classes target the smallest viewport we support; `sm:` / `md:` / `lg:` prefixes are the *only* way to add desktop expansion. You never set a larger value and shrink it down — scaling direction is one-way.

### 10.1 Supported viewports
- **Baseline** — 375 × 667 (iPhone SE). Unprefixed classes must render legibly, tappably, and without horizontal scroll (except inside `overflow-x-auto` wrappers on wide content like tables and code blocks).
- **`sm:` (640 px+)** — large phones landscape / small tablets. Where stacked mobile layouts can expand back into rows.
- **`md:` (768 px+)** — tablets, and the first size where dense multi-column layouts are allowed.
- **`lg:` (1024 px+)** — desktop. Max widths (`max-w-3xl`, `max-w-5xl`) kick in here but are usually enforced by `mx-auto` + intrinsic content.

`xl:` / `2xl:` are allowed for polish but never for correctness — a layout that only works at `xl:` is broken.

### 10.2 Rules of the road
- **Unprefixed = mobile.** Every layout and spacing value in §§3 and 5 is authored with its smallest-viewport form first.
- **Scale up, never down.** `px-4 sm:px-8` is correct. `px-8 sm:px-4` is forbidden — it says "start big, shrink on tablet," which inverts the mandate.
- **Stack by default, inline on `sm:`+.** Form rows with more than one control (input + button, two inputs + button, name + action) use the "Stacked row → inline" recipe from §5 (`flex flex-col gap-3 sm:flex-row sm:items-center`). A single control per row on mobile survives anywhere.
- **Tables and wide content wrap in `overflow-x-auto`.** Don't force-shrink columns; let the user scroll the table while the page itself stays non-scrolling.
- **Wrap button groups.** `flex flex-wrap gap-2` instead of `flex gap-2` so a toolbar doesn't overflow on a 375 px viewport when the content pushes it wide.
- **Touch targets ≥ 44 × 44 px** — see §7. `size="sm"` buttons are for secondary actions on inline toolbars, never for primary CTAs.
- **Max-widths are a desktop constraint, not a mobile one.** `max-w-3xl` on a mobile viewport is a no-op (mobile is narrower); you still need `px-4` to keep content off the edges.

### 10.3 Testing requirement
Every UI change is verified **at both 375 px and ≥ 1024 px** before shipping. DevTools → toggle device toolbar → iPhone SE → exercise the flow, then flip back to desktop. A "looks fine on my laptop" merge is a bug.

No automated test enforces this (per §1.3 we don't unit-test components). It's a manual gate, repeatedly, every change.

**Also test at a short viewport.** A laptop at 1080p with Windows display scaling at 150% (the common config) is ~720 CSS px tall, not 1080. Surfaces that pack chrome + a large typography ramp + a tall widget (the practice surface is the canonical case: TopBar + ModeBar + Readouts + Passage + Keyboard + Footer) can collapse the flex-1 region to one line at that height. Open DevTools, resize to a 1280 × 720 window, and confirm the layout doesn't collapse. Any surface whose `lg:` typography bump is too aggressive for short viewports must gate that bump on a `[@media(min-height:NNNpx)]:` arbitrary variant, or size itself to the room it actually has: the practice passage measures its column and picks the largest font that fits whole lines (`usePassageFit` in `src/app/_components/passage/use-fit.ts`). Same goes for fixed-height widgets that compete with `flex-1` content: the practice keyboard auto-hides under `[@media(max-height:750px)]:md:hidden` when there isn't honest room for both.

**Live readouts ride with the centred text, not pinned to the top.** The desktop readouts render through `<Passage above={…}>`, an optional slot inside the passage's own `justify-center` column directly above the clipped text, so readouts and text centre together. The slot's height is reserved from the passage's line-fit calc, and `<ReadoutRow>` holds `min-h-11` in every state. At rest the slot shows one hint ("Start typing · <Kbd>tab</Kbd> for a new passage"); while typing it shows one left-aligned row. Because the slot never changes height, the first keystroke doesn't reflow the passage. The slot is `hidden md:block`; on mobile the `<RestHint>` footer row carries "Tap the text to start" or the live readouts (one non-wrapping line), plus a `size-11` restart icon button with an aria-label. Below 640px wide the passage's font ceiling drops from 40px to 26px so a phone line holds a readable phrase. Don't reintroduce a top-pinned readouts row.

**The passage hugs short text and never shifts mid-run.** The viewport reserves whole lines (`clipHeight`, from the Lines setting or as many as fit) but shows only the text's own lines when the text is shorter (`visibleLines` in `passage/lines.ts`), so a one-line quote keeps its credit right under it. The line fit reserves the quote credit's height as well as the readouts slot, so a long quote never clips its last line. At rest the line count re-measures freely. During a run it only grows, and a negative bottom margin on the text block (viewport + credit) cancels the growth out of the centred group's layout height (`growthPull`), so a word pushed onto a new line (an extra letter, a wider mistake) grows downward and never moves the text under the caret. If the grown text would pass the column's bottom edge, the group rises just enough to keep the last line in view. The DOM measuring lives in `passage/use-lines.ts`.

### 10.4 Amending §§3 and 5 for mobile-first
When you add a new row to the spacing or layout tables:
- If the value might ever differ between mobile and desktop, write the pair inline: `py-10 sm:py-20`. Don't ship a single-value row "for now" and plan to revisit — future-you will forget.
- If the value is genuinely viewport-independent (icon size, input border), a single value is fine.

### 10.5 Pickers on mobile use a bottom sheet, not a popover

Any popover or dropdown that hosts a list of choices (theme picker, font picker, colour picker, section picker, import-source picker, …) must render as a fixed-height bottom-anchored modal on mobile. Reach for `<MobileSheet>` from `@/components/ui/mobile-sheet` — it portals to `document.body`, slides up from the bottom edge with a 220 ms ease-out transform, locks at `h-[75dvh]` every time, paints an iOS-style grab handle, fades a dimmed backdrop, and provides a header bar with a close affordance. Touch the iOS home-indicator inset via the built-in `safe-pb`. The sheet manages focus itself (§7 Modal focus), so callers don't move focus on open or close. `<MobileSheet>` shows whenever it is open, at any width: the caller decides when to use a sheet (most branch on `useIsMobile()`; the settings page picker uses it below lg, where the settings sidebar is hidden). From md its panel is centred and capped at `max-w-xl`. Rationale: a sheet that hid itself from md opened invisibly on tablets while still locking the page.

Triggers belong in the surrounding chrome, not inside the sheet itself. Prefer a **text trigger** showing the active value over an icon trigger — `Appearance ⌄` reads instantly, a hamburger glyph just says "menu" and competes with the topbar's nav menu icon. Reserve icon-only triggers for actions that don't carry navigational identity (export, import, sort, filter).

Branch on `useIsMobile()` from `@/lib/use-is-mobile`:

```tsx
const isMobile = useIsMobile();

if (isMobile) {
  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">{trigger}</span>
      <MobileSheet open={open} onOpenChange={setOpen} title="Pick a theme">
        {/* same items as the desktop popover */}
      </MobileSheet>
    </>
  );
}
return <Popover>{/* desktop UI */}</Popover>;
```

The desktop side keeps its existing `<Popover>` / `<DropdownMenu>` surface — they remain the right primitive for ≥ md viewports. The fixed-height rule on mobile is load-bearing: a sheet that sometimes covers half the screen and sometimes 80% of it makes the whole app feel jittery between settings.

Two exceptions to the fixed height: `<ConfirmDialog>` (Reset, Unfollow, imports) is a yes/no question, so on phones its sheet is sized to its content (`max-h-[85dvh]`), never a mostly empty 75dvh panel, with `h-11` Cancel / Confirm buttons. Every sheet and confirm backdrop is a dim scrim (`bg-black/40 dark:bg-black/60`), never `bg-foreground/*`, which turns into a pale wash in dark mode. Centred dialogs (`<DialogContent>`) keep a 16px gutter on phones (`w-[calc(100%-2rem)] max-w-lg`); `<CommandInput>` is 16px on phones (`text-base sm:text-sm`) so iOS doesn't zoom, and `<CommandItem>` rows are `min-h-11 sm:min-h-0`.

### 10.6 Mobile header chrome — icon-only buttons

Sticky chrome rows (the customise page header, the top bar, etc.) must collapse text-bearing toolbar buttons to **icon-only** at < `sm:` so a 375 px viewport doesn't wrap into two rows. Pair every icon-only button with an `aria-label` that carries the dropped text (`aria-label="Export settings"`).

Two size tracks, picked by role:
- **Primary mobile chrome (top bar bell, hamburger, profile actions)** — 44 px (`h-11 w-11`). These are the load-bearing nav affordances and need the §7 touch-target floor.
- **Secondary in-page toolbar chrome (settings header, filter bars, list-row utilities)** — 36 px (`h-9 w-9`). Padding around the row keeps the effective tap area generous, and a 44 px control inside an in-page chrome strip swells the strip taller than the top bar above it, which reads as visually heavy. Reserve this size for non-primary actions (section pickers, import/export, sort, filter); never for the page's primary CTA.

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={onExport}
  aria-label="Export settings"
  className="h-9 w-9 p-0 sm:h-8 sm:w-auto sm:gap-2 sm:px-3"
>
  <Download size={16} className="shrink-0 sm:size-3.5" />
  <span className="hidden sm:inline">Export</span>
</Button>
```

---

## 11. Flinttype primitives

Reusable building blocks live in `src/components/ft/`. Use these — don't reproduce their markup inline.

| Primitive    | Import                          | Use                                                                                                                                                                                                                                                                |
|--------------|---------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `<Logo>`     | `from "@/components/ft"`        | The flinttype brand mark: flame SVG (`/flinttype-logo.svg`) + lowercase `flinttype` wordmark + optional `version`. `size` (`sm \| md`). Anchored as a `<Link>` to `/`. |
| `<TopBar>`   | `from "@/components/ft"`        | App header (§5 Top bar): logo, floating pill nav (lg+), `right` slot pinned to the right edge, mobile hamburger that opens `<MobileNav>`. 64px tall. |
| `<MobileNav>`| `from "@/components/ft"`        | Hamburger button (md:hidden) that opens a full-width drawer below the header. Drawer shows nav links (large touch targets) + `drawerExtras` slot. Closes on route change, on `Escape`, or on hamburger toggle. Body scroll locked while open (the shared counted `lockBodyScroll`); Escape closes it unless an overlay on top already handled the key. `closeMobileNav()` (exported from `@/components/ft`) closes it from outside: a top-bar control that opens its own overlay calls it first, because the drawer (z-50) would otherwise cover that overlay and the focus it takes. Used by `<TopBar>`. The drawer's bottom section (`px-8 sm:px-10`) lines up with the nav rows' text. Its account and meta links are 44px rows, and the theme `<ModeSwitcher>` segments are `size-10 sm:size-8`. |
| `<Tag>`      | `from "@/components/ft"`        | Eyebrow / hairline label. Tone: `dim` (default), `ink`, `ember`, `ok`.                                                                                                                                                                                             |
| `<Stat>`     | `from "@/components/ft"`        | Labelled tabular value with optional delta + suffix. Sizes `sm \| md \| lg \| xl`. `accent` paints the value primary (coral); `bordered` adds a right divider for stat strips.                                                                                     |
| `<Kbd>`      | `from "@/components/ft"`        | Inline keycap chip: theme-aware `bg-card` with a double-bottom border, mono small caps. |
| `ftButtonVariants` | `from "@/components/ft"` | Server-safe twin of `buttonVariants` for styling a `<Link>` in a **Server Component** (`buttonVariants` lives in a `"use client"` module). Same §21 pill shape and sizes (`sm` h-8, `md` h-9, `lg` h-11); `ember` = orange `brand-surface` + `shadow-glow`, `ghost` = outline card, `ink` = filled foreground, `ghostDark` = outline on a fixed dark surface. Client code keeps using `buttonVariants`. |
| `<Avatar>`   | `from "@/components/ft"`        | A user's Clerk avatar — circular, hairline `ring-foreground/10`, sizes `sm \| md \| lg \| xl`. **Desaturated at rest, full colour on hover** of an ancestor `.group` (`liven={false}` opts out). Optional presence dot: `status="live"` (the lone coral spark, `motion-safe:animate-pulse`) / `"online"` (`bg-ft-ok`). Plain `<img>` (Clerk's CDN isn't in `next.config` remotePatterns and that file is off-limits). **Avatars are a sanctioned departure from the no-avatars bias — only the friends/live surfaces (§17.5) use them; do not sprinkle avatars onto other product chrome.** When `src` is null it renders the first letter of `alt` (a leading `@` skipped) on `bg-muted`; pass `alt=""` for a blank decorative avatar. |
| `<UserTag>`  | `from "@/components/ft"`        | Identity tag chip — lucide icon + uppercase label with per-tag colour/border/fill/glow tokens. Variants: `tag ∈ { owner, whitehat, og }`. Sizes `sm` (leaderboard row, h-5/text-[10px]) / `md` (profile hero, h-[26px]/text-[11px]). Hover (and focus) shows a Monkeytype-style two-line tooltip with the tag's name + one-line description; opt out with `tooltip={false}` only when the chip is itself inside an outer button whose own affordance already describes it. Icons use lucide-react with `strokeWidth={2.25}` so the glyph reads at 12–14px against the saturated fill. Static glow, no animation. Tokens are fixed across palettes (§2.3 User-tag tokens). Requires the root `<TooltipProvider>` in `src/app/providers.tsx`. The chip is `rounded-pill` (§21) with a `tracking-[0.08em]` uppercase label; the tooltip title is sentence case `text-xs font-semibold`. |

Buttons are shadcn `<Button>` everywhere (and `buttonVariants` on a `<Link>`); a Server Component that needs a button-styled link uses `ftButtonVariants`. The old square, uppercase `<FtButton>` and the fixed-paper `<Panel>` are retired; use `<Surface>` from `@/components/page-shell` for a card.

**Brand mark.** Always render via `<Logo>`. The flame SVG at `/public/flinttype-logo.svg` is the single source of truth — never hand-roll a square/diamond mark inline. An older rotated-square glyph appeared in early commits; it has been replaced everywhere.

**Top-bar control height** — every interactive control in the `<TopBar>` right slot (theme toggle, notifications bell, settings gear, avatar trigger, Sign in button) is **`h-9` / `size-9` (36px)** on desktop and `size-11` on phones where it is an icon button so the cluster reads as one row of equal-height controls beside the nav segmented card (which lands at ~36px via `p-0.5` + `py-1.5 text-[13px]`). Pin the height with `h-9`/`size-9` — never let it be driven by `py-*` + intrinsic text/avatar size, which silently produces a short control (the sign-in pill once rendered ~24px this way). Bordered segmented chrome that can't hit exactly 36px on the Tailwind scale without an arbitrary value (the `<ModeSwitcher>` icon toggle at `size-8` + border ≈ 34px) stays on the clean scale value — the 1–2px difference is invisible once `items-center` centres it in the 64px bar, and §3 forbids arbitrary heights to force the match. The avatar trigger is an icon button (`size-11 md:size-9`). The Sign in pill stays `h-9` at every width and adds `touch-hit` for the phone tap area.

**Hairline rule:** any section break is a single 1px border in `border-border` (theme-aware) or `border-ft-ink-line` (fixed dark). Surfaces take `shadow-card` per §21.

**Severity dot** — a 6×6 square (not circle): `bg-ft-ember` (high), `bg-ft-ember-soft` (mid), `bg-ft-dim` (low), `bg-ft-ok` (resolved/win).

---

## 12. Settings layout convention

Settings are a quiet inspector, not a magazine: short task-based pages, one grouped list per section, plain one-sentence copy, and rows that only appear when they do something.

### 12.1 Anatomy of a section
Settings are split into **task-based pages** (one route each), catalogued in `src/app/customise/_components/groups.ts` (`SETTINGS_GROUPS`):

| Page | Sections | Row anchors |
|---|---|---|
| Theme | `themes`, `colors`, `background` | |
| Typing | `typography`, `caret`, `typing-area` | `#mistakes`, `#tape` |
| Interface | `style`, `surface`, `geometry`, `chrome` | |
| Keyboard | `keyboard` ("On-screen keyboard") | `#keymap`, on the Show keyboard row |
| Stats & results | `live-stats`, `result` | |
| Behaviour | `input-handling`, `word-list`, `burst`, `audio`, `adaptive` | |
| Multiplayer & social | `multiplayer`, `spectate` | |

The catalog drives the sidebar, the mobile picker, section headings (`sectionTitle`), each page's Reset count (`GROUP_APPEARANCE_KEYS`, `GROUP_THEME_VARS`) and the legacy redirect. Add a section to the catalog first, then render it.

**One thing, one section.** A single on-screen object gets one section, even if its settings live in two stores. The keyboard is one section whose rows read from both the appearance prefs and the keyboard settings. Never split one object into two sections whose rows override each other.

Every section renders through `<SettingsSection id title description preview?>`:
1. **Header.** An `h2` (`text-lg font-semibold tracking-tight`) plus **one plain sentence**, with no eyebrow. When a preview exists, a ghost `Preview` toggle sits on the right (`h-11 sm:h-8`, and `aria-controls` only while open).
2. **One grouped list.** A `<Surface>` (`rounded-2xl border bg-card shadow-card`) holding the optional preview (top, `border-b bg-background`, mounted only while open) and the rows, separated by `divide-y divide-border/70`. Row components return fragments, never wrapper divs, so the hairlines land between rows.
3. **Rows.**
   - `<SettingsRow label control inline? id? preview?>`:
     - Padding is `px-4 py-3.5 sm:px-5`.
     - The label is `<LabelWithDesc title desc>`: a 14px medium title plus one 13px muted line.
     - Wide controls stack under the label on phones. From `sm` the row uses `sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8`, with a `shrink-0` control wrapper so the label wraps instead of squeezing the controls.
     - `inline` keeps short controls (swatch, typeface, mode, number input) beside the label at every width.
   - `<SwitchRow title desc checked onChange>`: the whole row is the switch's `<label>`, so the tap target is at least 56px.
4. **Reset.** There is no per-section reset; Reset lives in the page header (§12.7). Colour and typeface rows keep their own Reset (`h-9 sm:h-7`).

**Finger-sized controls.** Row controls are finger-sized on phones: dropdown triggers, colour swatch buttons, number and URL inputs, and per-row Reset / Remove / Choose / Browse buttons are `h-11` below `sm`, then `h-8`/`h-9`. The Mode switch segments are 40px (`max-sm:[&>button]:size-10`), like every settings segmented switch. Inputs keep the primitive's 16px phone text (no `text-sm` override) so iOS doesn't zoom.

**Progressive disclosure:** show a row only when it does something. A section whose rows all depend on one master choice puts that choice first, as a switch or a row with an Off option, and renders the rest only while it's on.
- **Keyboard:** "Show keyboard" comes first. While it isn't Off, the rows are Layout, Key arrangement, Key style, Key shape, Key labels, Number row, Size, Letters only (`keymapCompact`), Home row bumps, Shift symbols.
- **Live stats:** "Show live stats" (`statStripSurface` none/plain) comes first; the per-number styles, Background (Plain | Card), Colour and Opacity follow.
- **Other rows that show only while they apply:**
  - Background fit, opacity, blur and darken show once an image is set.
  - Tape position and fade show while tape is on.
  - Click volume shows while clicks are on.
  - The opponent marker shows while player colours are on.
  - Caret details hide when the caret style is Off.
  - The burst slider shows for Custom only.
  - **Result:** Show analysis comes first among the result switches. The four optional cards (Run details, Slowest letters, Hand split, Text heatmap) follow and stay visible whatever it is set to, since each card stands alone.
- **Colours:** four main rows; the rest sit behind a "More colours (N)" disclosure, which stays open while any of them is changed.

### 12.2 What lives in `control={…}`

| Choice space | Control |
|---|---|
| Single on/off (any boolean) | `<SwitchRow>`, never Off/On chips. |
| 2–8 short **text** values | `<SelectChips>` without previews, which renders the shared segmented switch (pill track, brand-orange selected pill). On phones it is full width with equal segments at `min-h-10` (a 48px target with the track padding); from `sm` it hugs its options at the compact height. |
| 2–6 **visual** values | `<SelectChips>` or `<ChipGroup>` of `<Chip preview>` (§12.2a). |
| 6+ short word values (caret Movement) | `<SelectChips>` segmented switch; on phones it drops to `text-xs` + `px-1` so the equal `flex-1` segments fit one row; below 375px it becomes a 3-column grid on a `rounded-3xl` track. |
| 7+ values, or long names | `<DropdownMenu>` with the active swatch + label on the trigger button (Theme). |
| Colour | `<ColorRow>`: an inline `SettingsRow` with a swatch button (hex shown from `sm`) and a ghost Reset while overridden. |
| Free input (URL, hex, name) | `<Input>` (right-aligned within the row). |
| Continuous numeric, fine-grained | `<SliderRow>` with a value badge. |
| Bounded number with an "unbounded" escape | The number control plus one `<Chip>` that toggles the escape and remembers the last number: Lines shown = number input + "All"; Line width = slider (30–200 ch) + "Full". `0` is the wire value. Both live in `rows/layout-controls.tsx`. The escape is never the slider's minimum. |

Live stats colour: a stored `#f97316` without the `liveStatsColorPicked` stamp is the old shipped default and reads as Default. Every pick from the settings saves the stamp with the colour, so the orange swatch sticks (`src/lib/live-stats-color-prefs.ts`, tested).

On themes, the legacy baked `--primary` / `--ring` values are removed on load only on the Default palette (`stripLegacyBaked`), so an orange accent or focus ring picked on another palette survives a reload.

### 12.2a Per-option chip previews

- Chips are **pills** (`rounded-pill`, so the Style → Button shape setting reshapes them too). The sample sits above a 12px label, with `px-2 py-2 sm:min-w-18 sm:px-4` and `min-h-11 sm:min-h-9`.
- Selected = `border-primary bg-primary/10 text-primary`. At rest = `border-transparent bg-muted text-muted-foreground`.
- **Phone grid:** `<ChipGroup>` is an even grid on phones. Up to four options share one row. Five or more use a 6-column grid with each tile spanning 2, and a short last row stretches (5 → 3 + 2, 7 → 3 + 3 + 1), so no row leaves an empty cell. From `sm` the tiles sit right-aligned in a wrapping flex row.
- Text-only options never use chips; they use the segmented switch.
- Chip samples that depict a Style option (shape, depth, font, size) hard-code their own radius, shadow or font stack instead of reading the live token, so the sample doesn't change with the current pick.
- A chip sample that draws a real component smaller also scales its radius. The 20px Key shape sample takes half the real key's `rounded-sm` (`rounded-[calc((var(--radius)_-_4px)/2)]`); otherwise Rounded reads as a circle next to Pill.


Whenever a setting's value is **visual**, each option in the chip group carries its own preview — a small sample of what that option does — stacked above the chip label. The user picks by comparison, not by guessing what "Bold" vs "Underline" means in context.

`SelectChips` and `ToggleChips` accept per-option previews:

```tsx
// Enum chips with per-option previews
const OPTIONS = [
  { id: "color", label: "Color", preview: <Sample style="color" /> },
  { id: "bold",  label: "Bold",  preview: <Sample style="bold" /> },
];

// Toggle chips with per-state previews
<ToggleChips
  value={prefs.markIncompleteWord}
  onChange={…}
  offPreview={<IncompleteChipPreview on={false} />}
  onPreview={<IncompleteChipPreview on={true} />}
/>
```

The `<Chip>` primitive (`src/app/customise/_components/chip.tsx`) stacks the `preview` above the `label` and inverts to primary when active.

Reach for chip-level previews whenever:
- The choice space is visual (highlight effect, caret style, fade strength, tape mode, mistake style, card surface).
- The label alone wouldn't tell the user which option matches their mental model.

Don't reach for them when:
- The label IS the value (font name, "WPM" / "CPM" unit, palette id).
- The effect is temporal and can't render statically (Blink speed, Smooth speed — the "Slow / Normal / Fast" labels carry it).

`<SettingsRow>` also exposes a `preview` slot that renders below the row. Reserve it for the rare case where chip-level previews can't capture the effect (e.g. a slider's continuous value, or a setting that affects layout proportions). Don't double up — never add a row preview on a row whose chips already carry previews.

Implementation note: chip previews are SSR-safe pure renders. Keep them small — one short line (`text-[11px] leading-none`), bare type or symbols, no chrome of their own.

**Where they live.** Chip samples are a quick at-a-glance hint *inside* the control; the section's togglable preview card (§12.5) is the decisive full render. The shared samples live in `_components/rows/chip-previews.tsx` (Surface, Chrome, Live stats, Result, Background) with the more bespoke grids co-located in their row file (`keymap-rows.tsx`, `multiplayer-rows.tsx`, `mistakes-row.tsx`, `tape-row.tsx`, the caret/radius/keyboard previews); behaviour samples live in `_components/rows/behaviour-chip-previews.tsx`. Keep them small (one short line) — the preview card carries the detail. Options where a sample would mislead keep none, per the "don't" list below: temporal values (blink / smooth speed), pure label-is-value picks (font family, palette id, keymap layout name, the WPM/CPM acronym carries a representative number rather than the unit itself), continuous sliders (their value badge is the live readout), and pure pipeline flags with no visual surface (exclude-casual-from-adapt).

### 12.3 Nesting rule

Every option that belongs to the same parent topic lives **inside the same section**. Examples:

- **Caret & cursor** — Style, Thickness, Roundness, Blink, Smooth — *all in one section*.
- **Typography** — Family, Size, Word spacing — *all in one section*.
- **Geometry** — Radius, Borders (and any future spacing scale) — *all in one section*. Borders is a 3-way switch (Default / Soft / Hidden) that flips `<html data-ft-borders="…">`; globals.css force-overrides every hairline in the cascade. Pair with `BordersApplier` mounted from `app/providers.tsx`. Corners is measured against the active palette (`rows/radius-presets.ts`). With no override it shows the palette's own radius, and no chip is lit when that falls between presets. A pick clears the override only when the palette already gives that radius. It writes the palette preset's own value when it matches that preset (Claymorphism 0.75rem, Cyberpunk 0rem), and `<rem>rem` otherwise, so Round on a 0.5rem palette gives 1rem.

Don't sprinkle related settings across sections; if you find yourself doing that, rename the section or split it cleanly.

### 12.4 Spacing

| What | Class |
|---|---|
| Page header → first section, between sections | `gap-10 sm:gap-12` on the page column |
| Section header → list | `gap-4` |
| Row padding | `px-4 py-3.5 sm:px-5`, rows divided by `divide-border/70` |
| Preview padding | `px-4 sm:px-5`, the same edge as the rows |
| Anchor offset | `scroll-mt-20 lg:scroll-mt-8` on sections and anchored rows |

### 12.5 Pages, anchors and previews
- **Pages and anchors.** Each page is its own route; its sections are anchors (`/customise/<page>#<section>`). `/customise` redirects to the first page.
- **Legacy links.** `/customise/appearance` is a client redirect: `legacyAppearanceHref(location.hash)` sends `#id` to its new page, row anchors included (`#keymap` → `/customise/keyboard#keymap`).
- **Previews** stay real: the same components the practice screen runs, inside `<PreviewPracticeProvider>`. They **default collapsed**, and the toggle is saved per section in localStorage (`ft:customise:preview:<id>`). Specific previews:
  - The Typing area preview seeds a wrong and an extra letter, so the Mistakes row has a visible target.
  - The Keyboard preview draws the keyboard exactly as the test does: layout, arrangement, labels, number row, size and Letters only from the appearance prefs, key style and marks from the keyboard settings. It shows a short note while the keyboard is Off.
  - The Live stats preview shows a note while live stats are hidden.
- **Sidebar** (`_components/sidebar.tsx`), from top to bottom:
  - A "Search settings" pill (`rounded-pill border bg-card shadow-card`) that calls `openCommandPalette()`. It shows a ⌘/Ctrl K hint from `sm`, which steps aside in the rail under the Mono app font.
  - The pages with icons. The active page is `brand-surface text-primary-foreground shadow-glow`, the same as the top bar's active route.
  - The active page's sections, listed under it on a left rail. The section in view is `text-primary` with a 2px orange rail mark.
  - After a hairline, a "Design with AI" entry, filled orange on `/customise/appearance/ai`.
  - Pills are `min-h-10 py-2` and grow when a wider app font wraps a label; they never overflow.
- **Scroll-spy** uses an IntersectionObserver with `rootMargin: "-10% 0px -80% 0px"`. At the bottom of the scroller the last section wins, unless the URL hash names a section that's on screen. Only the group's own page (`pathname === group.href`) gets a section mark; the palette gallery and the AI studio highlight no section.
- **Page switches** start at the top via `<ScrollReset>`; hash links are left to land on their anchor.
- **Palette gallery.** `/customise/appearance/themes` counts as part of Theme. Its back link is `lg:hidden`. The gallery reads the light/dark mode only after mount (`useMounted`), so tiles hydrate without a mismatch and then repaint in the real mode. Orange tile names are reserved for the active palette.
- **Phones** get the same structure in a `<MobileSheet>`: search at the top, the pages as pills, the current page's sections, and Design with AI. The trigger names the current page, or "Design with AI" on the studio.
- **Never mock a preview.** If it needs a setting the real component doesn't honour yet, fix the component.

- **Preview sample.** Previews type through one shared sample, `PREVIEW_WORDS` in `_components/preview-practice.tsx`. It is 36 words, starting with the pangram that the cursor and error positions are tuned to, so the passage fills its lines like a real test and Lines shown, Line width and Size visibly change it. The result preview keeps the 9-word `PREVIEW_PANGRAM` run. Previews live by area in `_components/rows/`: `passage-previews.tsx` (Theme, Colours, Background, Font, Caret, Typing area), `interface-previews.tsx`, `stats-previews.tsx`, `keyboard-preview.tsx` and `multiplayer-preview.tsx`.

### 12.6 Don't
- **Don't** re-implement the row shell ad-hoc; always use `<SettingsRow>` / `<SwitchRow>`.
- **Don't** use Off/On chips for a boolean; use `<SwitchRow>`.
- **Don't** show a row that has no effect in the current state, and don't offer a choice whose effect is bigger than its label: "Hidden" as a background that actually removes the whole strip belongs on a master switch.
- **Don't** split one on-screen object across two sections, or give two rows the same name.
- **Don't** add eyebrows, uppercase tracked labels (including dropdown group labels) or developer terms (CSS var names, component names) to settings copy. One plain sentence per description, UK spelling, sentence case.
- **Don't** make previews open by default.
- **Don't** put negative margins on controls inside the settings scroller.
- **Don't** mix preview-chips and text-chips in the same row; don't add per-chip previews on temporal values (blink/smooth speed).
- Call it "Settings" in user-facing copy.

### 12.7 Page header
`<SettingsPageHeader group customizedCount onReset>` is built on `<PageHeader>`:
- **Title and description:** the page name is the h1, followed by the group's one-line description.
- **"Reset (N)":** an outline button with a primary-coloured count. It shows only while N > 0, and the count covers only that page's keys, those with a visible control. It confirms with "Reset N settings?" and never touches other pages. The count and Reset measure against the active palette's baseline: the defaults with that palette's presets on top (`paletteBaseline` in `src/lib/themes/palette-baseline.ts`; a Custom fork uses the palette it came from). A palette's own font size, word spacing, corners or key style never count. Size and word spacing compare by value, so "1.0" and no override are the same (`effectiveOverride`). Reset restores that baseline, not the bare defaults, and a Custom fork that is back at its baseline returns to its palette. Every colour, corner, size or spacing change re-checks the palette (`paletteAfterOverrideWrite` in `src/lib/themes/palette-fork.ts`). The picker reads Custom only while the overrides differ from the palette's baseline, and goes back to that palette as soon as they match again. A fork made from Default goes back to Default. A reload follows the same rule (`paletteAfterThemeMigration`), so a fork whose palette sets its own size or spacing stays Custom even with no overrides left. A fork made from Background reactive records that origin, re-samples the background image under its overrides, and returns to Background reactive on Reset.
- **"Import / export":** an outline menu with three items: "Export settings", "Import flinttype settings" and "Import MonkeyType settings". There is no group label.
- **"Design with AI":** an outline link button with an orange Sparkles icon.
- **Phones:** Import / export and Design with AI collapse to `size-9` icon buttons with aria-labels (§10.6).

- **Import / export status.** The status line sits under its button: left-aligned on phones, where the header actions start at the left edge, and right-aligned from `sm`. Its menu items are `min-h-11` on phones.

### 12.8 AI settings assistant
- **Where it lives.** The studio stays at `/customise/appearance/ai`, inside the settings shell. It is reached from the "Design with AI" header button on every settings page and from the sidebar entry. The floating "Design with AI" pill is **retired**: it covered the first control and doubled up with the friends dock.
- **Header.** The studio header is a `<PageHeader>`. It shows Apply to settings (primary) and Reset (ghost) only while a preview patch is pending.
- **Previews.** Previews are `rounded-2xl` cards in a two-column grid; Result and Keyboard span both columns. The Keyboard tile always draws the keyboard (`KeyboardLivePreview alwaysShow`). The sixth tile is "Buttons & cards" and renders `<StylePreview>`, which uses a container query (`@container` / `@lg:`) to fit both a full-width section and a half-width tile.
- **Chat dock.** The dock is `rounded-2xl border bg-card/95 shadow-float` with a `brand-surface` send pill (`size-11` on phones, `size-8` from sm). It is `sticky` to the bottom of the settings scroller (`bottom: calc(0.75rem + env(safe-area-inset-bottom))`) and centred on the page column (`max-w-2xl`). It floats over the previews while they scroll and comes to rest under the last one. It needs no footer measuring, because the pinned footer sits outside the scroller. Its textarea is 16px on phones (14px from sm), and Apply / Reset are `h-11` on phones.
- **Signed out.** The dock shows a muted line, "Sign in to design with AI.", where "Sign in" is a `text-primary` link to `/sign-in?redirect_url=/customise/appearance/ai`. The textarea and send button are disabled, with the placeholder "Sign in to describe a look". If the session runs out mid-chat, the reply shows the same line, never red error text.
- **Catalog values.** The fixed-option catalog's radius and word-spacing values match the settings presets, so the matching preset lights up after Apply.
- **Corners on Apply.** Apply settles the corner pick against the active palette the way the Corners row does (`settleRadius` in `ai/_components/settle-radius.ts`, using `radiusWrite` from `rows/radius-presets.ts`). A radius the palette already gives clears the override instead of writing it, so a no-op pick never forks the palette to Custom or adds to Reset.
- **Style knobs.** The catalog also carries `controls` (pill | rounded | square), `depth` (flat | soft | lifted), `glow` (on | off) and `appFont` (sans | mono | system). They resolve to `controlShape`, `depth`, `buttonGlow` and `uiFont` and are whitelisted in `APPEARANCE_FIELDS`. `<PreviewScope>` writes the Style picks a patch makes onto its wrapper as explicit `data-ft-controls|depth|glow|ui-font` attributes, defaults included. App size (`uiScale`) and Page glow (`pageAura`) stay out of the catalog, because a tile can't show a root font size or the page background.
- The model **never invents values**: it picks option ids from the fixed catalog (`src/server/routes/appearance/options.ts` → `KNOBS`), resolved server-side to an `AppearancePatch` and re-validated by `sanitizePatch`.
- The flow is preview-only until Apply: the preview patch themes the previews through `<PreviewScope>` / `<PrefsOverrideProvider>`; Apply writes through the same typed setters as the manual controls (`useApplyPatch`).
- No API key → a clear error under the input.

### 12.9 Palette switching
- Every palette switch goes through `usePaletteSwitch` (`src/lib/themes/use-palette-switch.ts`): Settings → Theme (dropdown and phone sheet), the palette gallery (`/customise/appearance/themes`) and the command palette. Render `<PaletteSwitchDialog {...dialog} />` (`src/components/palette-switch-dialog.tsx`) beside the control that calls it. Never call `usePalette().apply` / `reset` directly from UI.
- It asks first only when the theme overrides or keyboard settings differ from the active palette's baseline (§12.7), because a switch rewrites exactly those.
- One `<ConfirmDialog>` everywhere: "Switch to <name>?"; one line naming what resets (colours, corners, font and keyboard look); an "Export my settings to a JSON file first" checkbox, on by default; and "Don't show this dialog again", saved per browser in localStorage `ft-theme-skip-confirm`. The confirm button reads "Export & switch" or "Switch anyway". Focus lands on the first checkbox.
- A pick made from inside another overlay (dropdown menu, command palette) closes that overlay and hands focus to the dialog, instead of letting the overlay return focus to its trigger.
- Picking the active palette again does nothing.

Rationale: one guard and one dialog, so no entry point silently resets a user's colour, corner, font or keyboard changes.

## 13. Animation primitives

Animation in flinttype is the **exception**, not a default. The product is warm and calm (paper-and-ink, soft cards, one orange spark); ambient motion fights the aesthetic and trips `prefers-reduced-motion`.

`framer-motion` is the only sanctioned animation library, but reach for it sparingly:

- **The AI settings suggestion reveal (§12.8)** is a sanctioned exception: when the appearance assistant returns a proposed look, its suggestion card springs in (`opacity` + `y` + `scale`, ease-out, ~180ms, no bounce) and collapses to a static fade under `prefers-reduced-motion` via `useReducedMotion()`. It earns motion because it's a user-initiated reveal of a result (spatial continuity), mirroring the friends dock.
- A control's effect is genuinely **temporal** and a static sample cannot represent it (the live caret blink in the running practice surface, where blink speed is itself the setting).
- A user-initiated transition (route change, modal entrance) where the motion provides spatial continuity.
- **The friends dock (§17.5)** is a deliberate, user-mandated exception: opening the collapsed pill springs the panel up from the corner with a single transform-based reveal (`opacity` + `y` + `scale`, ease-out, ~180ms, no bounce). It earns motion because it's a user-initiated reveal of a tucked-away surface (spatial continuity). It collapses to a static reveal under `prefers-reduced-motion` via `useReducedMotion()`. The panel reveals as **one** element — the directory rows do **not** stagger (an earlier hub iteration staggered a list; that's retired, don't reintroduce per-row stagger).
- **The race lanes (`<RaceLineupPanel>` + `<Lane>` in `lineup-lane.tsx`, §23)** are a user-mandated exception. The layout is **TypeRacer-style: one lane per racer** inside one `rounded-2xl border bg-card shadow-card` card (§21). From `sm` each lane is one row, left to right: `[ mark · name ] · rounded track pill with the racer's stone · [ status ]`. **On phones the lane stacks**: the name and status share one row above a full-width track, so the stone has the card's whole width to travel. Lanes keep a **stable order** (you first, then join order), so an overtake reads as the stone gliding past, never the list re-sorting.
  - **Track:** a `rounded-pill` (`bg-muted/70`, lifted to `dark:bg-foreground/[0.07]` for opponents so the dark stone never sinks into a dark card; your own lane is `bg-primary/[0.07]`). It has a dashed ground line and a finish post near the right end, and stacked posts read as one finish line.
  - **Stone:** each racer is a **flint-stone SVG** (`/public/stone-assets/*.svg`, a 7-tier fire progression from pebble to inferno). The tier rises with the racer's live WPM via `stoneTierForWpm`. The image carries `max-w-none` so it never collapses at 100%.
  - **Motion:** the **glide** along the lane is functional motion (`transition-[left]`). The subtle idle bob (`@keyframes ft-stone-bob`) is applied **only** via `motion-safe:animate-[…]`.
  - **Colour:** the local user is the orange spark: an orange `drop-shadow` on the stone, an orange trail and a tinted track. Opponents' stones get a thin theme-aware halo, `drop-shadow(0 0 1.5px color-mix(in oklch, var(--foreground) 55%, transparent))`, so the pebble art reads on any track. Opponents stay ink, or their `playerColorFor` when the player-colours pref is on.
  - **Left mark:** a round orange ready check (filled `brand-surface` = ready, host implied) **only in a private lobby's lobby phase**, with `Ready` / `Not ready` spelled out on the right. Everywhere else (public matchmaking, the countdown, racing) the mark is the racer's colour dot and readiness is not shown.
  - **Status:** while racing it is WPM (yours orange, others ink), then `#place`. The header's Words / WPM / Acc strip describes your own run, so it is **hidden for a watcher with no seat**.
  - **Lobby controls:** because the lanes show who's present and who's ready, the private-lobby block (`<ChallengeLobby>`) carries **only** the controls.

  This is the one place a looping idle animation is allowed. Keep it subtle.

### 13.1 Don't

- **Don't** animate per-option chip previews (§12.2a). They're *static + live* — a bare sample of the value, no motion. (Section-level preview cards were removed entirely — see §12.5.)
- **Don't** use motion on a settings row's control (toggle, chip, slider). Native shadcn primitives have their own focus / hover transitions.
- **Don't** loop ambient decorations on any surface. The only sanctioned infinite animations are loaders, the live-spectate pulse dot (§17.4), the race-stone idle bob (§13, race lanes) and the live race status dot (`<StatusText tone="live">`, §27, which marks a race still running, like the race screen's joining line in §23). All are `motion-safe`-gated.
- **Don't** ship any animation without `prefers-reduced-motion: reduce` collapsing it to a single static frame.

## 14. Identity & ownership marks

Identity tags (OWNER, WHITE HAT, OG, future kinds) are not chrome — they're a claim *about* a user, surfaced wherever that user's name appears. The renderer is `<UserTag>` (§11), painted from the per-tag token quartet in §2.3 → **User-tag tokens**.

### 14.1 Where tags render

| Surface                          | Size  | Position                                              |
|----------------------------------|-------|-------------------------------------------------------|
| Leaderboard row                  | `sm`  | inline run after the handle, before any stat columns  |
| Profile hero                     | `md`  | inline run beside the display-name `h1`                |
| Edit-profile dialog ("Your tags")| `sm`  | toggleable chip row — every eligible tag rendered; tap to show/hide. Auto-saves on click via `profile.setTags` |
| Notifications popover (grant row)| `sm`  | inside the `og_granted` notification body              |

Tag display is the intersection of **eligibility** (which tags the user is allowed to wear, decided server-side from grants + the OWNER allowlist) and **selection** (which of those the user has opted to actually display, stored in user-prefs). Eligibility is permanent; selection is reversible — users toggle chips in the Edit Profile dialog and the change saves immediately. A user with no stored selection defaults to "show all eligible"; an empty `[]` selection is the explicit opt-out. Canonical paint order comes from `USER_TAG_IDS` in `src/types/user-tag.ts` either way.

### 14.2 Adding a new tag

A new tag ships only when **every** piece below lands in the same commit:

1. Extend `USER_TAG_IDS` (`src/types/user-tag.ts`) with the new id. Order matters — the array is the display-weight order.
2. Add the four CSS tokens (`--ft-tag-<id>-{fg,border,fill,glow}`) to `:root` in `src/app/globals.css`. Identity tags have **no** `.dark` override — the quartet is fixed across modes (§2.3); opaque fills carry their own contrast.
3. Add a catalog entry (label, aria-label, lucide icon component) to `TAG_CONFIG` in `src/components/ft/user-tag.tsx`. **Always a lucide-react `LucideIcon`** — never a hand-rolled SVG. Tags share the icon vocabulary with every other glyph in the app; bespoke SVGs read as foreign next to the lucide stroke family even when proportions are close. If lucide doesn't have a glyph that fits, pick the closest match and discuss before adding a custom one.
4. Add a row to §2.3 "User-tag tokens" and update §14.1 if the surface set changes.
5. Wire the backend grant path (where the tag becomes attached to a user). Eligibility is computed by `resolveEligibleTags` (`src/server/resolve-tags.ts`); any tag present in a user's Clerk `publicMetadata.tags` is automatically eligible, so a *manually-granted* tag (added by hand in the Clerk dashboard) needs no extra code. An *automatic* grant (e.g. OG's 1000-user milestone) writes that metadata itself. A preview-only self-grant for the owner in local dev lives in `src/server/dev-tag-grant.ts` (never fires on a hosted deploy or under tests). **WHITE HAT** (`whitehat`) is a manual grant: the owner adds it to a user's `publicMetadata.tags` once they've reported 3+ major bugs, and self-grants it in local dev to preview the chip.

### 14.3 Don't

- **Don't** animate a tag. The "glow" is a static box-shadow. Animated chips read as notifications, not identity.
- **Don't** stretch a tag bigger than `md`. The chip is a sub-element beside a name, not a parallel headline.
- **Don't** reach for tag tokens from product surfaces. Only `<UserTag>` consumes them.
- **Don't** invent a "this account is verified / premium / staff" tag without first deciding whether it's an identity mark (use `<UserTag>`) or an *attribute* of the row (use `<Tag>` from §11 with `tone="ember"`). Identity marks are sparse and persistent; attributes can be plentiful and transient.

## 15. Minimisation knobs (Surface + Chrome)

flinttype's editorial paper-and-ink default reads well at full chrome, but a sizeable cohort of typing-test users live in the Monkeytype idiom: passage on bg, no panels, no rules, chrome fades during a run. Rather than fork a "minimal mode," the design ships a slate of knobs that compose down to that look — each independently editable so the user can land anywhere between editorial and stripped.

### 15.1 The two settings sections

- **Surface** (`/customise/appearance#surface`) — `cardSurfaces` (solid / subtle / transparent), `dividers` (hairline / dashed / hidden), `pagePadding` (tight / comfortable / roomy), `backgroundFill` (themed / bare), `monochromeChrome` (off / on). All preserve the user's chosen *palette*; they collapse *containers*. Ships with three preset bundles (Editorial / Minimal / Stripped) so the most common landings are one click.
- **Chrome** (`/customise/appearance#chrome`) — `topbarStyle` (elevated / flat / text-only), `footerStyle` (visible / compact / hidden), `autoHide` (off / dim / fade) for fading sticky chrome while a run is active. Plus a `Focus mode` reminder: press `F` (outside an input) for a session-temporary stripped view; `Esc` restores. (The mode bar on the practice surface is **always** the chips picker — there is no mode-bar style knob.)

### 15.2 Implementation contract — data attributes only

Every Surface / Chrome knob lands as a `<html data-ft-…>` attribute, applied by `<AppearanceApplier>` in `src/app/appearance-applier.tsx`. globals.css owns every visual rule. **No component reads these prefs at runtime to alter its markup** (except where genuinely needed: Readouts gates rendering on `none`, Passage on caret idle / quote attribution). The contract:

| Pref | HTML attr | Default value (no attr written) |
|---|---|---|
| `cardSurfaces` | `data-ft-cards` | `solid` |
| `dividers` | `data-ft-dividers` | `hairline` |
| `pagePadding` | `data-ft-padding` | `comfortable` |
| `backgroundFill` | `data-ft-bg-fill` | `paper` |
| `monochromeChrome` | `data-ft-monochrome` | (off; attr absent) |
| `topbarStyle` | `data-ft-topbar-style` | `elevated` (note the `-style` suffix — `data-ft-topbar` is the self-marker on the TopBar element) |
| `footerStyle` | `data-ft-footer-style` | `visible` (`-style` suffix for the same reason — `data-ft-footer` is the AppFooter self-marker) |
| `autoHide` | `data-ft-autohide` + runtime `data-ft-running` | `off` |
| `controlShape` | `data-ft-controls` | `pill` |
| `depth` | `data-ft-depth` | `soft` |
| `buttonGlow` | `data-ft-glow="off"` when false | on |
| `pageAura` | `data-ft-aura="off"` when false | on |
| `uiFont` | `data-ft-ui-font` | `sans` |
| `uiScale` | `data-ft-ui-scale` | `default` |
| `(Focus shortcut)` | `data-ft-focus="on"` | (off; attr absent) |

The whole table lives in one place: `HTML_ATTR_RULES` in `src/lib/bootstrap.ts` (kinds `enum`, written unless it equals `fallback`; `flag-on`; `flag-off`). Both the pre-paint bootstrap script (the table is embedded as JSON) and `<AppearanceApplier>` (via `htmlAttrsFor()`) read it, so a new knob is one row there plus its CSS. Never hand-write a `setAttribute` for an appearance knob.

The bootstrap lays the stored appearance slice over `APPEARANCE_ATTR_DEFAULTS` (same file, pinned to `DEFAULT_APPEARANCE` by `bootstrap.test.ts`), so a first visit or a partial slice paints the final attributes before first paint. `<AppearanceApplier>`, `<BordersApplier>` and `PaletteProvider` leave `<html>` alone until their slice has loaded, so hydration never repaints the defaults. `loaded` (from `useAppearancePrefs` / `useRemotePrefs`) flips as soon as the localStorage copy is read, or as soon as the user writes that slice while the first prefs GET is still pending. So a pick always applies at once, and a slow GET never holds it back. Only the hook's own slice counts, so a write elsewhere never un-gates flash-guarded UI such as the Discord banner. A new mirrored knob also adds its default to `APPEARANCE_ATTR_DEFAULTS`.

Component self-markers that the CSS rules attach to:

| Marker | Sits on | Purpose |
|---|---|---|
| `[data-ft-topbar]` | TopBar root | Auto-hide target + topbar style override target. |
| `[data-ft-topbar-pill]` | The boxed nav inside TopBar (only there; the text-only rules apply inside `[data-ft-topbar]`) | text-only mode flattens it. The active route then stays ink, semibold, with a 2px orange underline, and focus rings survive. |
| `[data-ft-footer]` | AppFooter root | Auto-hide target + footer-style override target. |
| `[data-ft-footer-expand]` | Footer nav link block | Hidden under compact footer style. |
| `[data-ft-chrome]` | Interior chrome (settings sidebar/header) | Auto-hide target. |
| `[data-ft-divider]` / `.ft-divider` | Anything you want the divider rule to honour | Targeted by `data-ft-dividers="hidden|dotted"`. |
| `[data-ft-caret-idle]` | CaretGlyph when `phase==="rest"` and `caretIdle==="pulse"` | Drives the `ft-caret-idle-pulse` keyframe. |

### 15.3 Don't

- **Don't** add a Surface / Chrome knob whose visual effect requires reading the pref inside a React component when a `<html data-ft-…>` attribute + a globals.css rule can deliver the same effect. Data-attr knobs are zero-cost to toggle and don't re-render components.
- **Don't** rename `data-ft-topbar-style` / `data-ft-footer-style` to drop the `-style` suffix. The unsuffixed forms are taken by component self-markers; the suffix is load-bearing.
- **Don't** animate the auto-hide transition beyond the 240ms opacity tween already defined. The user is mid-keystroke; the chrome should disappear quickly enough that they don't notice, not slowly enough to distract.
- **Don't** drop `pointer-events: none` from the `fade` autohide rule. Without it, a stray click on the invisible topbar mid-run can cancel the test.
- **Don't** put `data-ft-topbar-pill` on a control outside the top bar, or on one whose selected state is a filled pill: text-only strips the fill and leaves white text on paper.

## 16. Command palette

A globally-mounted Cmd/Ctrl+K palette is the keyboard-first surface for every customisable preference. Mounted once in `src/app/providers.tsx` (`<CommandPalette />`) so it's available on every route. Don't mount it again — the shortcut already binds there.

### 16.1 What it is

- Built on shadcn's `Dialog` + `Command` primitives (`src/components/ui/dialog.tsx`, `src/components/ui/command.tsx`), which wrap `@radix-ui/react-dialog` and `cmdk` respectively. Use those primitives directly when you need a dialog or a searchable list anywhere else; don't fork.
- Two-tier view: the root list shows every entry grouped by category (Mode, Theme, Behaviour, Caret, Keyboard, Appearance, Navigate). Selecting an enum entry swaps the list to a sub-view of its options, where Enter writes the value and returns to root. Escape backs out of a sub-view (and only closes the dialog when already on root).
- Toggles flip on Enter and the dialog stays open (so you can flip several settings in one keystroke session). Actions and links close the dialog. Picking an enum option closes the sub-view.
- **Two openers:** `Cmd/Ctrl+K` (the canonical shortcut — don't rebind it) and **`Esc`**. Escape opens the palette **only when it would otherwise do nothing** — Escape stays primarily a *close/back* key, so the opener bails when any of these is true: the palette is already open (its own capture handler owns Escape — back out of a sub-view, else close); an overlay is open (a Radix dialog/alertdialog/popover/dropdown, the notifications bell, or the friends dock — each detectable in the DOM only while open); focus mode is on (`html[data-ft-focus="on"]` — Escape clears it first, §15); or a text input/textarea/contenteditable is focused (don't steal a blur/clear, and never interrupt typing the passage). When none apply, Escape opens the palette. `F` (focus mode, §15) stays orthogonal. The single global keydown listener for both openers lives in `<CommandPalette>`.
- Focus is pinned to the search input on every open AND on every view switch (root ↔ enum sub-list) via a `requestAnimationFrame` re-focus pass. cmdk's Command primitive doesn't always present a focusable as the first DOM-order child, so Radix's default `onOpenAutoFocus` can land on the dialog shell instead of the input — the explicit ref + rAF focus is more reliable.
- `Tab` and `Shift+Tab` are swallowed (`preventDefault`, no other action) so Radix's focus trap doesn't visibly shift the highlight off the input. The Back button in the enum sub-view is `tabIndex={-1}` for the same reason. The user reaches Back via Esc, not Tab.

- **Third opener:** `openCommandPalette()` from `@/lib/command-palette/open` dispatches `ft:command-palette:open`, which `<CommandPalette>` listens for. Use it for "Search" affordances; never import the palette component. `commandKeyLabel(navigator.platform)` returns "⌘" or "Ctrl" for shortcut hints.
- The Escape opener ignores events that are already `defaultPrevented` (e.g. Radix closing a dialog), so the palette's own closing Escape can't reopen it.
- Style entries: Button shape, Depth, App font and App size are enums; Button glow and Page glow are toggles.
- Result entries mirror the Stats & results switches in order: "Result: show analysis", "Result: run details", "Result: slowest letters", "Result: hand split", "Result: text heatmap".
- Palette copy is sentence case: group headings, value chips, the footer, and a "Current" tag in `text-primary`. Entry labels mirror the settings row titles; keyboard entries sit under the Keyboard heading (Show keyboard, Key style, Key shape, Key labels, Keyboard number row, Keyboard: letters only). "Show live stats" is a toggle (`statStripSurface` plain/none). There is one "<Page> settings" entry per settings page; `SETTINGS_PAGES` (`src/lib/command-palette/`) mirrors the route catalog by hand (lib can't import from app/), so keep them in step.

- Escape in a sub-view goes back to the root list. The palette handles Radix's `onEscapeKeyDown` and only lets it close the dialog at root, because Radix listens on the document in the capture phase, before the content's own key handler.
- Rows: an enum shows its current option label and a disclosure chevron. A link shows where it lands from `sm` as a muted breadcrumb: the page, a `size-3` `ChevronRight`, then the section or sub-page it opens (`destination: [page, section]`; anchored links match the page and section names in `SETTINGS_GROUPS`, checked by `entries.test.ts`), hidden on phones so the label keeps the width. Action and link rows have no trailing arrow (§17.5). On phones the dialog keeps a 16px gutter (`w-[calc(100%-2rem)]`), the search input is 16px, enum option rows are `min-h-11`, and the keyboard-hint footer is hidden.
- The Palette entry lists Default first (a reset, as in Settings), plus Custom while a custom fork is active. Re-picking the current palette is a no-op. Colours, Background image and Palette gallery links sit in the Theme group; Pulse caret is a Caret toggle.

### 16.2 Adding an entry

Add the entry to the builder for its settings area: `src/lib/command-palette/entries-<area>.ts` (`general`, `behaviour`, `typing`, `keyboard`, `interface`, `stats` (which includes races), `navigate`), using the helpers in `entry-helpers.ts`. `use-command-entries.ts` only wires in the pref hooks. The label, hint and every option label mirror the settings row exactly, in the settings order. `entries.test.ts` checks unique ids, hints of 80 characters or fewer, that every enum's value is one of its options, that link anchors exist in `SETTINGS_GROUPS`, and that `SETTINGS_PAGES` matches the catalog. Every entry is one of four kinds — `action`, `toggle`, `enum`, `link` — described in `src/lib/command-palette/types.ts`. Discipline:

- **One entry per user-facing setting.** Toggles and enums render inline; the user never leaves the palette to flip them.
- **Sliders, colour pickers, and any control that needs a custom widget** ship as `link` entries that deep-link to `/customise/...#<section>` (the customise page's section anchor). The palette closes and the customise page opens at the right surface. Don't try to inline a slider — the keyboard flow degrades and the palette becomes its own form.
- **Keep `hint` short** (one line, ≤ 80 chars). It renders under the label in muted text and is search-indexed alongside the label and `keywords`.
- **Use `keywords`** for tokens a user might type but that don't appear in the label (e.g. `["monkeytype", "minimal"]` on surface entries). cmdk's filter sees them.

### 16.3 Don't

- **Don't** add an entry whose `set` callback opens another modal or navigates somewhere unrelated. The palette is "I know what I want, do it now" — every entry should resolve in zero or one Enter press. One sanctioned exception: the Palette entry goes through the shared palette-switch guard (§12.9). When the switch would reset colour, corner, font or keyboard changes, the command palette closes and hands keyboard focus to the guard's confirm dialog (`usePaletteHandoff`, `src/components/command-palette/use-palette-handoff.ts`). The dialog renders beside the command palette, so it works on every route. With nothing to lose, the switch applies at once and the command palette stays open.
- **Don't** add ambient open/close animation beyond the standard Radix Dialog fade + zoom shadcn ships with (data-state classes from `tw-animate-css`). The palette is high-frequency keyboard chrome; a custom Framer transition would just add latency.
- **Don't** mount a second palette anywhere. If a page needs its own searchable command surface (e.g. a per-page "pick a passage"), build it as a local `Command` instance — not a second Cmd+K palette.

## 17. Social & friend controls

The friends system introduces reusable relationship affordances. They reuse existing semantic tokens (§2.1) — the only new convention is *which state maps to which treatment*, so the one coral spark rule (§2) holds across every surface a follow control appears on.

### 17.1 `<FollowButton>` (`src/components/follow-button.tsx`)

The single relationship control, reused on profile heroes and friends-list rows. **The label never morphs on hover** — a control that swaps "Friends" → "Unfollow" under the cursor resizes the row and is too easy to mis-click. The state is *stable*; management actions live in a dropdown, and the destructive ones (Unfollow, Block) route through a confirm step. State → treatment:

| State | Treatment | Rationale |
|---|---|---|
| not following | shadcn `Button` default (`bg-primary`) — "Follow", plus a ⋯ menu (Block) | The one coral CTA: the move we want the viewer to make. |
| `followedBy && !following` | default (`bg-primary`) — "Follow back", plus ⋯ (Block) | Still the action we want; still coral. |
| `following && !mutual` | a stable outline status that opens the menu (Unfollow, Block); `compact` rows show only the ⋯ | Established; drops out of coral so it never competes with the live spark. |
| `mutual` (friends) | stable outline status with a small coral `Check` + "Friends" that opens the menu (Challenge, Unfollow, Block); `compact` rows show only the ⋯ | Friendship is marked by a *small* coral check only, never a filled coral surface. |
| `blocking` | `variant="outline"`, `text-muted-foreground` — "Blocked" → click unblocks (no confirm; not destructive) | Quiet; a block is not a brand moment. |
| `blockedBy` | renders nothing | No affordance toward someone who blocked you. |

Rules: **at most one filled `bg-primary` follow control per view** (the Follow / Follow back CTA). Once connected, the control is always `outline` and **stable** (no hover swap). Management lives in a `⋯` `DropdownMenu`: Invite to a race (friends only → opens a private lobby via `createLobbyAndInvite`, notifies the friend, and navigates the host to `/race/c/<slug>`), Unfollow, Block. **Unfollow and Block always confirm** via the shared `<ConfirmDialog>` (`src/components/ui/confirm-dialog.tsx`) — a destructive relationship change is the sanctioned exception to the §-13 "modal as last resort" bias. `compact` (dense rows) hides the connected status button and shows only the ⋯; the default (profile hero) shows the labelled status that opens the same menu. Loading disables + relabels ("Following…"); errors render as a `text-destructive` line below (§6.3). `size="default"` on profile, `size="sm"` in dense rows.

The Follow / Follow back CTA carries a leading `UserPlus` icon; the ⋯ trigger is an `outline` icon pill (`size-11 sm:size-9`, `size-8` in `sm` rows); `<InviteToRaceButton>` is an `outline` pill with a `Swords` icon (`h-11 sm:h-9`). Menu items are sentence case.

### 17.2 People navigation — one switch idiom

Every segmented switch in the app is the **§21 segmented switch**: a pill track (`rounded-pill border border-border bg-muted/70 p-1`) with the selected option as a filled brand pill (`rounded-pill brand-surface text-primary-foreground shadow-card`) and `text-muted-foreground hover:text-foreground` at rest. Use `<OptionSwitch>` / `<SegmentedControl>` from `@/components/ui` rather than re-rolling it. `<SegmentedControl>` is an ARIA radio group with one Tab stop (the selected option): arrow keys move the selection and wrap, Home / End jump to the ends, and a pointer click drops focus while keyboard activation keeps it. When a pick remounts the control (a page that renders a different view per choice), the new instance takes focus back. Counts ride inline per segment in `tabular-nums text-muted-foreground`. Full-width (segments `flex-1`) on mobile so it never overflows 375px; hugging from `sm+`. The top-bar nav uses the same language: its active route is a filled brand pill with the glow (`brand-surface text-primary-foreground shadow-glow`). (The friends dock (§17.5) deliberately uses a single search over friends + following rather than a Friends / Following switch — it's a glanceable directory, not a tabbed list.)

In a dense in-page section on phones (e.g. a sort-by or model switch above a table), the segments get the §7 finger target: `[&>button]:h-10 sm:[&>button]:h-auto` (with `[&>button]:px-3 sm:[&>button]:px-2.5` on `size="sm"`), so the pill track reaches about 44px at <sm and stays compact from sm.

### 17.3 Empty-state copy

List empty states use a single dashed-border card (`rounded-2xl border border-dashed border-border bg-card/40`) with one plain sentence that names the next action ("You're not following anyone yet. Find people on the leaderboard and follow them."). No em dashes, no restated headings. (The blog index uses it, followed by a muted "Coming up" list of unpublished titles that are never linked.)

### 17.4 Live-spectate consent chip (`<SpectatePill>` / `<SpectateIndicator>`)

`src/components/spectate-indicator.tsx`. Broadcasting a live practice run is **ambient** — there is no dedicated broadcast page. Once a user opts in (Customise → Behaviour → Live spectating), any passage-based surface streams via the invisible `<PracticeLiveBroadcast>` mounted inside `PracticeProvider`. The only visible trace is a small chip:

- **`<SpectatePill enabled>`** — presentational. `rounded-md` hairline chip, mono `text-[10px]` uppercase tracked, with a leading status dot + an `Eye` glyph (lucide). The single coral spark is the dot in the **on** state (`bg-primary` with `motion-safe:animate-pulse`); the off state is quiet ink (`text-muted-foreground`, `bg-card`). Pulsing coral dots are reserved for live-spectate state — this consent chip plus the live markers in the friends dock + watch surfaces (§17.5). They convey live state, not decoration (§13), and every one is gated behind `motion-safe:` so reduced-motion users get a static dot. Don't introduce a pulsing dot anywhere else. The one other exception is `<StatusText tone="live">` (§27), which marks a live race state ("Race in progress") the same way the race screen's joining line does (§23).
- **`<SpectateIndicator>`** — the hooked wrapper mounted on practice/drill surfaces. Renders the pill (linking to the toggle) **only** while signed-in and opted-in, so it never reflows the typing area in the common off case, and doubles as the persistent "your runs are visible" consent reminder.

Don't invent a second "live"/"recording" badge for the broadcaster. A *spectatable friend who is currently broadcasting* is marked separately in the friends dock (§17.5); this chip is strictly the broadcaster's own consent state.

### 17.5 Friends dock — a global, non-intrusive corner affordance (`src/components/friends-dock/`)

There is **no `/friends` page** (it was removed). The friend graph lives in a small, always-available **dock** pinned to the bottom-right corner, mounted once globally from `providers.tsx` (alongside the command palette). It is the one place flinttype runs avatars at full fidelity (an explicit product call, so the rest of the app stays avatar-free). Don't rebuild the old wide hub page; the dock is the friends surface now.

**Collapsed** — a slim floating `h-10 rounded-pill border bg-card/90 shadow-float` pill, **2xl+ only** (≥1536px, where it sits in the page gutter; on narrower screens it covered the practice keyboard, profile cards, drill tiles and footer links): a stack of up to three live/online friend avatars (or a `Users` glyph when idle), a count, and a `Swords` + N badge when race-lobby invites are pending. The label reads `N live` in coral when anyone's broadcasting (the dock's lone spark), else `N online` / `Friends` in muted ink. This is the resting state, quiet and glanceable, never blocking content.

**Expanded** — clicking the pill opens a `w-[min(88vw,360px)]` panel from the corner (`rounded-2xl bg-popover shadow-float`, fixed height). Top to bottom: a sentence-case "Friends" `h2` with a `rounded-pill bg-muted` count and a ghost close button (desktop only; on mobile `<MobileSheet>` supplies it); a pill search (`<Input>` with a leading icon, `type="text"`); the directory grouped by bucket under small sentence-case labels (`text-xs font-medium text-muted-foreground` + count): **Race invites**, **Live now**, **Online**, **Offline**. Each row is an inset link (`rounded-xl px-2.5 py-2 hover:bg-accent`, min-height 56px) with an avatar (or an orange-tinted Swords disc for an invite), the handle + `<UserTag>`s and a sentence-case caption ("Wants to race", "Typing at 92 wpm", "Practising", "Active 5m ago"). Join and Watch are tinted orange pills (`rounded-pill bg-primary/10 text-primary`) that fill to `bg-primary text-primary-foreground` on row hover. Footer: an outline "Find people to follow" button (→ /leaderboard), desktop and mobile.

- **Challenges are pending invites only.** The dock surfaces only *unread* `race_invite` notifications — a friend opened a private lobby for you. Joining or marking the notification read clears it from the dock. There is no separate duels/results page; a race that's been joined just runs.
- **The directory is glanceable.** Rows link to the profile; the `<FollowButton>` (§17.1) lives there, not in the dock, so the dock stays a read-only "who's around" surface.
- **It steps aside.** Hidden on intentionally immersive surfaces (`/race` — incl. private lobbies at `/race/c/<slug>` — `/live`, `/sign-in`, `/sign-up`, and the chrome-less screenshot assets `/card` and `/updates`) and while a run is active (`data-ft-running`) or focus mode is on (`data-ft-focus`, §15) — the states where the user asked chrome to disappear.
- **Below 2xl** the pill never floats. A `Users` icon button in the top bar (`size-11`, `md:size-9`; signed-in, dock routes only; marked `data-friends-trigger`) dispatches `OPEN_FRIENDS_EVENT`, which toggles the dock: the §10.5 bottom sheet (`<MobileSheet>`) on phones, and from md the same panel hanging under the top bar at the right edge (`transform-origin: top right`). Hung from the top-bar button (md to below 2xl), the panel sits on the bar's gutter (`right: 1.5rem`), flush with the avatar and its menu. Its search field and "Find people to follow" button are `h-11 md:h-10`.
- **Keyboard:** the desktop panel is a labelled modal dialog (`role="dialog" aria-modal="true" aria-label="Friends"`) using `useFocusTrap`, with the whole dock as its root. Opening it moves focus to the search field (the panel itself on touch), Tab stays inside, Escape closes it (claimed before the command palette's Escape opener), and closing returns focus to the opener. The top-bar Friends button and the corner pill carry `aria-haspopup="dialog"` and `aria-expanded` (`useFriendsDockOpen` from `@/components/friends-dock`). Opening the dock from the bar closes the hamburger drawer first (`closeMobileNav()`), so the panel never opens, focused, underneath it. Rationale: the panel is mounted after the page, so without this it was a page-length of Tabs away from its button, Escape also opened the palette, and at md to lg an open drawer hid the focused panel.
- **Data** comes from `useDockData` (`friends.listFriends` / `listFollowing`, `live.friendsLive`, `presence.list`, and `notifications.list` for pending `race_invite`s), polled only while the dock is mounted and the tab is foregrounded (zero requests on a hidden tab, matching the broadcaster / watch loops, multiplayer.md).

- **Placement:** the collapsed pill floats above the page footer, never over it. It measures how far the footer reaches into the viewport: the full height for the pinned footer under compact surfaces, and the visible part for the in-page footer at the end of a scrolling page. The pill rides up as the footer scrolls into view and drops back to the corner gap when the footer is off screen or hidden.
- **Steps aside:** add `/card` and `/updates` to the routes where the dock is hidden (they are chrome-less screenshot assets).

**Activity stays out of the dock.** Friends' personal bests, new follows, and mutual-friendship events live **only** in the notifications bell (`notifications-popover.tsx`, fed by `notifications.list()`). The dock is *who's around and who you can play*, not a timeline.

Don't reintroduce a dedicated `/live` broadcast page — broadcasting is ambient (§17.4) and watching is reached from the dock.

**No directional arrow glyphs in affordance labels.** Don't append `→` / `←` / `‹` / `›` to buttons, links, or row affordances ("Watch", "Accept", "Follow", a nav segment), and don't use them as standalone trailing icons. The hover/active state and the row itself carry the affordance; an arrow is redundant editorial noise here. (This is distinct from genuine inline-content arrows like a chart axis; the rule is about call-to-action chrome.) Direction icons that belong to data (a `<DeltaText>` arrow, a `<ChangeRow>` arrow and slope sketch, a `<TrendWord>` icon) are content, not affordances, and are allowed. They always sit beside words that carry the same meaning; a `<ChangeRow>`'s arrow and sketch mean better (up) or worse (down), as its title does. So is the `size-3` muted `ChevronRight` between the two levels of a breadcrumb (the command palette's page-then-section destination, an icon, never a typed "›"): it shows hierarchy inside a row and is never the row's call to action.

### 17.6 Live watch = a fullscreen clone of their screen (`/live/[userId]`)

The watch page is **fullscreen + immersive** — no `<AppChrome>`. It's a `min-h-dvh` surface with a slim sticky header (back to practice · the broadcaster's avatar/handle under a single coral "Spectating" eyebrow · a Fullscreen-API toggle). The cloned screen is **full-bleed** — no frame, no max-width, no card — filling the entire body under the header and laid out exactly like the real practice surface, so it reads as their screen, not a preview tile. The broadcaster, meanwhile, always sees who's watching via the prominent §17.4 spectator-count chip on their own practice screen. The slim sticky header (`bg-background/80 backdrop-blur-xl`) holds ghost pill icon buttons for Back and Fullscreen (`icon-lg` on mobile, `size-9` from sm) and the broadcaster's `md` avatar, with their name (a link to the profile) + tags over a single orange "Watching live" line led by a pulsing dot (`motion-safe`). The not-live state is a `rounded-2xl` dashed empty state: icon disc, "Not live right now", one line, and an outline `lg` "Back to practice" button.


Spectating is **not a bespoke read-only view** — it reproduces the broadcaster's actual practice screen, **every phase**: the real `<ModeBar>` + `<Readouts>` + `<Passage>` while they type, and the real `<TestSummary preview>` on their results screen. `<LiveClone>` (`src/app/live/_components/live-clone.tsx`) mounts those real components (never a fork — a second renderer of the practice surface always drifts out of 1:1 sync) against a frozen `PracticeContext` rebuilt from the live snapshot, the whole surface `pointer-events-none` (it's a view, not controls), wrapped in:

- **`<PrefsOverrideProvider>`** (`src/lib/prefs-override.tsx`) — feeds the broadcaster's appearance / caret / behaviour prefs to the real components. The `useAppearancePrefs` / `useCaretSettings` / `useBehaviourPrefs` hooks consult this context first and return the override read-only (their `update`/`reset` no-op), so the viewer's own stored prefs are never touched. This is the **only** sanctioned way to render practice components with someone else's settings; don't mutate the global prefs store to theme a subtree.
- **The broadcaster's resolved theme CSS vars** on the clone container (`style={screen.themeVars}`) — `--background`, `--primary`, `--ft-passage-*`, `--ft-font-*`, … cascade to the real components so colours + fonts match exactly, scoped to the container (not `<html>`, so it never fights the viewer's own theme).

The broadcaster sends this `screen` payload (phase + windowed `typed` + cursor + mode/length + `adapt` + appearance + caret + behaviour + theme vars, plus the run's `events` on the `done` frame and either its `wpmHistory` or, for a BURST run, a precomputed `burst` block: the summary plus per-second buckets, rolled up by `burstResult` and handed to the clone's `<TestSummary>` through `<BurstResultProvider>`, because the try log never leaves the broadcaster's tab) in `live.progress` **in every phase** while on a practice surface — so "live now" reflects whoever's on their typing screen, and the spectator sees mode changes and results, not just typing. An absent payload falls back to the plain `<LivePassage>` mirror. The watch view replays snapshots through a **~1s jitter buffer** (`useBufferedWatch`) so the mirrored screen advances smoothly instead of stuttering with network jitter. Don't add a "spectator skin" — if the clone looks wrong, the broadcaster's real component is the bug.

### 17.7 Presence & last-seen captions

A friend's row carries a one-line presence caption under their name: a small status dot + a short label. It's the caption line on `<FriendListRow>` (it **replaces** the low-value "since" join date wherever presence data exists — i.e. for everyone you follow; a follower you don't follow back has no presence and falls back to "since"). The compact "Online" strip (`<OnlineNow>`) appends a quiet activity word after the name for practising / racing friends.

**The dot colour is load-bearing and obeys the one-coral-spark rule (§2).** The coral pulse stays reserved for live-broadcasting (`<LiveNow>` only). Every *online* presence state — online, practising, racing — uses the sanctioned green `bg-ft-ok`. **Activity is conveyed by the word, never a second colour**; a practising friend is not a second coral.

| Presence state | Dot | Caption label (row) | Strip suffix (`OnlineNow`) |
|---|---|---|---|
| online | `bg-ft-ok` | `Online` | (none — the green dot already reads "online") |
| practising | `bg-ft-ok` | `Practising` | `Typing` |
| racing | `bg-ft-ok` | `In a race` | `Racing` |
| idle (rare; not actively set) | `bg-ft-ok/50` | `Away` | (none) |
| offline | `bg-muted-foreground/40` | `Active <relative>` | n/a (offline friends aren't in the strip) |

The dot is `size-1.5 shrink-0 rounded-full`; the caption is sentence case `text-xs text-muted-foreground` with `tabular-nums` on the relative figure (no longer an uppercase tracked micro-label). Relative-time copy comes from `relativeTime()` (`src/lib/relative-time.ts`): `just now` / `5m ago` / `2h ago` / `3d ago` / `2w ago`, then an absolute `May 4` past ~a month. The state→label/dot mapping is `presenceCaption()` / `activityWord()`; reach for those, don't hand-roll the mapping per surface.

**Activity reporting.** `status` is now genuinely populated. A surface declares the local user's activity by mounting `<ReportActivity status="practicing|racing" />` (`src/app/_components/report-activity.tsx`) inside its `<PracticeProvider>` — the practice/drill surfaces report `practicing`, the race screen reports `racing` (never while spectating). It writes to the `presence-activity` module store (`src/lib/presence-activity.ts`); the global `<PresenceHeartbeat>` reads that store on every beat and fires an immediate beat on change so the switch reaches friends within a second. Don't prop-drill activity into the heartbeat — declare it with `<ReportActivity>`.

### 17.8 Notifications popover (`notifications-popover.tsx` + `notification-row.tsx`)
- **Panel:** `rounded-2xl bg-popover shadow-float`, a fixed sheet under the top bar on mobile and anchored to the bell at md+ (`w-[380px]`, scrolls inside).
- **Header:** sentence-case "Notifications" with a `bg-primary/10 text-primary` pill count, and a ghost `xs` "Mark all read" button.
- **Rows:** inset `rounded-xl hover:bg-accent` links; no dividers. Titles stay ink; orange appears only on the unread dot of PB/mutual kinds, the PB delta chip (`bg-primary/10`) and the "Friends" check.
- **States:** loading is a skeleton; empty is an icon disc + "You're all caught up" + one line.

## 18. Profile page (`/profile`, `/profile/[username]`)

The profile is the app's **shareable surface** — built to look good to a stranger who's never used flinttype, so it leans visual and identity-forward. Components live in `src/app/profile/_components/`; data is derived client-side from one `history.summary` / `publicProfile` snapshot (`derive-stats.ts`).

### 18.1 Hero layout

`<ProfileHero>` is the page's header: a single `<Surface>` card (no `<PageHeader>` above it) with a faint flame wash across its top (`absolute inset-x-0 top-0 h-32 bg-linear-to-b from-primary/10 to-transparent`). The relationship/menu **actions sit in the top-right corner**, *out of the content flow*, never a third flex column beside identity/stats. It is a grid: `grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto]`. On phones the avatar shares row 1 with the actions and the identity drops beneath at full width (so a Follow button never squeezes the name). From `sm` it is avatar | identity | actions. Order inside the card:

1. **Identity**: `<ProfileAvatar>` (size-16 sm:size-20, framed by a thin `brand-surface` flame ring, `p-0.5` + `border-2 border-card`), the name as the page's h1 (`text-2xl sm:text-3xl font-bold`), `@handle · Joined Mon YYYY` in `text-sm text-muted-foreground`, a chip row (rank badge, `<UserTag>`s, a muted "Follows you" pill), and friend counts. Actions: the owner's ⋯ (`<OwnerMenu>`, outline icon pill `size-11 sm:size-9`) or a visitor's `<FollowButton>` (+ a `sm:`-only `<InviteToRaceButton>` for friends).
2. **Stats tiles** (`<HeroStats>`): `grid-cols-2 sm:grid-cols-4` of `rounded-xl bg-muted/50` tiles with sentence-case labels (Tests / Time typing / Best WPM / Streak). **Best WPM is orange on every view**: it's the profile's headline number. The other values stay ink. While the snapshot is loading or failed, every value shows a muted "—", never a misleading 0.
3. **Experience bar** (`<LevelLockup>`) closes the card above a hairline: Level + number, an `h-2.5 rounded-full bg-muted` track with a `brand-surface` fill, and "N XP total / N XP to level N+1" beneath.

The MonkeyType import prompt (`<MonkeytypeBanner>`) sits directly under the hero: a neutral `rounded-2xl border bg-card` card with a muted eyebrow, an **outline** small "Import" button and a ghost dismiss icon. It is an optional extra, so it never uses the orange.

### 18.2 Activity + Skill split card (`activity-skill-card.tsx`)

A `<PageSection title="Activity and skill">` holding one `<Surface>` **split between Activity and Skill**: the 26-week heatmap on the left (~60%) and the compact skill radar on the right (~40%), divided by a hairline (`md:grid-cols-[1.6fr_1fr]`, stacking with a top border on mobile). Both halves are `flex-col justify-between` (h3 header, body, legend), so the two legends share a baseline and no dead space pools under the heatmap. Heatmap: cells `aspect-square rounded-[30%]` on an **orange intensity ramp** (`color-mix` of `--primary` at 30/50/75/100%, empty days a 7% ink wash). Month labels are sentence case, `overflow-visible` (never clipped), skipped when the next month starts within three weeks or in the last two columns. Captions pluralise ("1 active day"). The radar renders `compact`.

### 18.3 Skill radar (`<SkillRadar>`, `src/components/skill-radar.tsx`)

A **four-spoke** radar (**Speed, Accuracy, Consistency, Endurance**) — the shape is the story; there's no value table beside it (redundant; raw numbers live in the stats strip + Personal bests). Profile values are derived by `deriveSkills` (`derive-stats.ts`) — each spoke a 0–100 score: Speed = best WPM vs a **300** ceiling; Endurance = best WPM on any ~30s+ run (keyed off actual elapsed time ≥ ~28s, since `mode` doesn't distinguish time vs words) vs a **250** ceiling; Accuracy rescaled into the 80–100 band; Consistency = 100 − WPM CV.

- **Always overlay the average baseline.** A radar with no reference reads as arbitrary, so `<SkillRadar baseline={…}>` draws a second muted **dashed** series (the average-typist scores) behind the user's coral shape, with a tiny "You / Average" legend. The baseline lives in `src/lib/skill-baseline.ts` — a committed default, **regenerated from real data by `yarn skills:baseline`** (computes each user's axes with the same `deriveSkills`, averages them, rewrites the file). Run it periodically + commit.
- **`<SkillRadar>` is a shared component** (`src/components/`) because two surfaces use it: the profile Activity+Skill split card (real `deriveSkills` data) and the `/updates` showcase card (a sample shape). `compact` tightens it for small slots. Don't fork it. It reuses the shared `ChartContainer` from `@/components/ui/line-chart` (same wrapper `wpm-trend` uses) — do **not** add a second chart wrapper. Orange (`var(--primary)`) stroke + ~0.2 fill over a hairline polar grid, **no glow filter** (the "glowing radar" demo is off-brand: §13 bans ambient glow).
- The chart is **`pointer-events-none` + `[&_*]:outline-none`** so a stray click never draws a focus box around it, and **`outerRadius` is held back (~66–70%)** with margins so the axis labels never clip. It's a static visual, not an interactive control.

### 18.4 Rank badge (`<RankBadge>`, `rank-badge.tsx`)

A **self-selected** WPM-tier flair (Ember…Solar Flare, `src/types/rank.ts`) shown beside the name. Distinct from §14 identity marks: those are *eligibility-gated* (server-resolved grants); a rank is *free choice*, a cosmetic the user picks in Edit profile regardless of actual speed (the picker only *suggests* a tier from their best WPM). One fixed ember tint across all 11 tiers — a `Flame` glyph in coral + the label in ink, in a hairline chip; no tier is louder than another. Stored as a `{ id }` object slice under the `profileRank` pref (object-slice so the object-only `useRemotePrefs` hook binds it); read into the profile snapshot server-side via `readProfileRank` so visitors see it too.

### 18.5 Section order, switches and data colour

**Order:** hero → Personal bests → Activity and skill → WPM trend → Recent runs. Each section after the hero is a `<PageSection>` with its content in a `<Surface>`.

**Switches.** Both section switches are the shared `<SegmentedControl>` sized by `SECTION_SWITCH`: Personal bests mode (All / Casual / Adapt / Races) and trend range (1D 1W 1M 3M All, with `sr-only` full names). On phones the track is full width at `p-0.5`, with equal segments of at least 44px (`[&>button]:min-h-11`). From `sm` it is a hugging `h-10 p-1` track.

**Orange on the profile:** Best WPM, the XP fill, the avatar ring, the radar "you" series, the heatmap ramp, the trend line, the record crown and the selected switch segment. Personal-best values and run WPMs stay ink.

**Personal bests.** Tiles are equal-height `rounded-xl bg-muted/50`. An empty length is one muted "—" (aria-hidden, with sr-only "No run yet"). When a category has no run at any standard length, one line replaces the grid ("No Casual runs at these lengths yet.", plus which lengths count).

**WPM trend.** It receives every completed run. The range filters by date, the average is taken on the filtered runs, and the series is then downsampled to at most 80 points, each the mean WPM of equal consecutive buckets (`trend-series.ts`). The axis and tooltip speak in dates, or times for spans of about a day or less, and never a test number. Date ticks label each day once, at most 6. An averaged point's tooltip says "Aug 26 to Aug 27 · average of 4 tests". With fewer than two runs the switch hides and the card says "Finish two tests to see your trend".

**Recent runs.**
- **Crown:** an orange `Crown` marks a run only when it *is* one of the Personal bests numbers (`pickRecordRunIds`). That means standard lengths only, keyed by unit and length across all modes like the All view, and never a length with a single run. A run beaten by an imported best never crowns.
- **Mode labels:** Race / Adapt / Reverse / Casual (the same labels on Insights, the leaderboard and Biogram's Recent tests).
- **Units:** "WPM" is upper case everywhere.
- **Share button:** `size-11 sm:size-8`.

**Load states.**
- **Loading:** section-shaped skeletons.
- **Owner's failed load:** a dashed card under the hero with plain copy, a quiet "Error code: X" (never the server's raw message) and "Try again" (or "Sign in").
- **Visitor's failed load:** the error card alone, carrying the h1 (no hero built from the URL).
- **Unknown username:** a "Profile not found" card carrying the h1.

**Radar.** Compact sizing is `h-[220px] max-w-[300px]` with 44px side margins and `outerRadius` 72% so "Endurance" never clips.

**Edit profile.**
- Rank chips are `h-11 sm:h-8` pills, the selected one `brand-surface`. Tag toggles are at least 44px tall on phones.
- The dialog stays open while saving (`keepOpen`) so server errors show, and closes on success. A username change follows the new `/profile/<name>` URL.

### 18.6 Don't

- **Don't** reinstate a "head-to-head" comparison panel. Comparison was removed in favour of each profile's own skill radar; a sparse two-column stat table read as empty. If cross-user comparison returns, overlay a second series on the radar, don't build a stat grid.
- **Don't** make the actions a flex column beside identity/stats (the original bug). Top-right corner only.
- **Don't** paint the rank badge per-tier colours or animate it — it's identity, not a notification.

## 19. Update cards (`/updates/[slug]`)

A major release worth showing off gets an **update card** — a **light, wide, visual advert** at the private route `/updates/<slug>`, built to **screenshot and paste into Discord** (which renders wide images large), not to read like a changelog. **Landscape, condensed, visual:** a headline + a single row of preview thumbnails, **no per-feature prose**. The changelog (`public/CHANGELOG.md`) stays the exhaustive per-version log; the update card is the *promo asset*.

- **Registry-driven.** Content lives in `src/lib/updates.ts` (`UPDATES`): `{ slug, version, title, tagline, date, versions[], highlights[] }`, where each highlight is `{ preview: string, label: string }` — `preview` keys into `UPDATE_PREVIEWS`, `label` is a one-word caption. Add an entry; the route + changelog link derive from it. No per-card bespoke page.
- **Bespoke previews, not icons.** Each highlight renders a small **mini-mockup** of the feature (hub / challenges / spectate / profile) from `UPDATE_PREVIEWS` (`src/app/updates/_components/previews.tsx`; the 6.148 rehaul card's previews live in `rehaul-previews.tsx` beside it, to keep each file in size) — little framed UI snapshots (a people list, a race-invite row, a live passage, a profile card) built **entirely from the fixed `ft-*` light tokens** so they stay light inside the forced-light card. They're `aria-hidden` decoration with a one-word label beneath; the mockups carry the message. A generic lucide-icon tile is **not** good enough — the previews sell the feature.
- **The card** (`src/app/updates/[slug]/page.tsx`) is a **forced-light, landscape** asset (`max-w-4xl`) built from fixed `ft-*` paper-and-ink tokens so it renders the same in dark mode. **No `<AppChrome>`**. Shape: `rounded-2xl` with a static ember wash (a `bg-ft-ember/15 blur-3xl` disc in the top-right corner, no motion); `<Logo>` + a sentence-case `bg-ft-ember/12` version·date pill; a `text-3xl sm:text-5xl` headline + tagline; a single wide row of `h-32 rounded-xl` preview tiles with sentence-case `text-sm font-semibold` labels (an odd last tile spans both columns on mobile); a footer strip ("flinttype.com" / "Type faster, together"); a rounded "Back to changelog" link beneath. All hairlines on this asset are `ring-1 ring-ft-line-soft` or 1px `bg-ft-line-soft` fills, never borders.
- **Small screens:** mini-previews stack vertically (identity row, then the action or stats row) so they read inside a ~140px phone tile; captions are `whitespace-nowrap truncate`; the back link is a `rounded-pill h-11` pill. The friends dock and the What's new dialog stay off these pages.
- **Private (`noIndex: true`)** via `buildPageMetadata`, so it's omitted from sitemap + `llms.txt` (SEO S8). Unknown slug → `notFound()`.
- **Changelog linkage:** the `/changelog` page calls `updateForVersion(entry.version)` and renders a "Read the update" link on covered entries. List the headline versions in the update's `versions[]`.
- **Don't** make the card technical, theme-aware, or chrome-wrapped — it's a fixed-light advert. Don't hand-roll a second update page outside the registry, and don't index these pages.

## 21. Shape, depth and style

The rehaul's visual system. Every value routes through a token so the Settings → Style rows can retune the whole app at once.

| Token / utility | Default | Use |
|---|---|---|
| `rounded-pill` (`--radius-pill` → `--ft-radius-control`) | `9999px` | **Every interactive control**: buttons, chips, segmented switches and their thumbs, inputs, nav links, icon buttons, menu triggers. `data-ft-controls="rounded"` swaps it to the card radius, `"square"` to 0. |
| `--radius` | `1rem` | Card radius scale: `rounded-lg` = 16px, `rounded-xl` = 20px, `rounded-2xl` = 24px. Cards and panels use `rounded-2xl`; nested rows/menu items `rounded-xl`. The Geometry → Radius row and themes override it. |
| `shadow-card` (`--ft-shadow-card`) | soft warm lift | Cards (`<Surface>`, `<Card>`), the nav capsule, segmented thumbs. `data-ft-depth="flat"` removes it, `"lifted"` deepens it. |
| `shadow-float` (`--ft-shadow-float`) | clear hover | Popovers, dropdowns, dialogs, tooltips, the friends dock, the Discord pill. |
| `shadow-glow` (`--ft-shadow-glow`) | faint primary halo | Only the filled primary button (the page's one spark). `data-ft-glow="off"` removes it. |
| `brand-surface` (utility) | flame sweep of `--primary` | The filled primary button, the active top-bar route, the selected segment of a switch. A soft top-to-bottom gradient of the primary (lighter crown, deeper base) echoing the logo; derived from `--primary` so palettes get a matching sweep. |
| `bg-thumb` (`--thumb`) | derived from the palette | A raised neutral thumb, for the rare toggle that must not read as a selection. |
| Page aura | `radial-gradient` of `--primary` at 9% behind the top of the page | A quiet warm wash under the top bar. `data-ft-aura="off"` removes it. |

Rules:
- Never hard-code `rounded-md`/`rounded-full` on a control, or an arbitrary `shadow-[…]` on a surface — use the tokens above so the Style settings reach it. (Avatars, dots and progress tracks stay `rounded-full`: they are shapes, not controls.)
- One filled primary button per view. Secondary actions are `outline` or `ghost`.
- `buttonVariants()` returns merged classes (`cn()`), so a `className` passed to it replaces a conflicting variant class (`h-11` over the size's `h-9`) on a `<Link>` exactly as it does on `<Button>`.
- Selected/active states are orange (`brand-surface` or `text-primary`), never black or neutral grey.
- Fixed artifacts that ignore the user's theme (the share result card, the /card brand card, the update cards, the `/landing` cover) paint their hairlines as `ring-1` / `ring-inset` or 1px `bg-*` fills, not `border-*` — the Borders setting recolours every border with `!important` and would wash out a fixed-colour hairline. Theme-aware primitives placed on a fixed artifact get fixed tokens too: the `/landing` keycaps are `<Kbd className="border-0 bg-ft-paper-2 text-ft-ink ring-1 ring-inset ring-ft-line-soft">`.
- The Outlines knob (`data-ft-borders`, Settings → Interface → Outlines) recolours borders globally; `.border-transparent` stays transparent (ghost buttons, chips at rest) and `.border-primary` stays orange (selected chips) under every mode. Rely on those two utilities rather than inline styles.
- Motion on controls is limited to colour/shadow transitions (~200ms ease-out) and the button press (`active:scale-[0.98]`); no bounce.
- Primary is the logo orange `#f97316` in both modes with white, `font-semibold` label text on `brand-surface` (its deeper base improves label contrast).

### 21.1 Style settings (Settings → Interface → Style)
- **Rows** (`_components/rows/style-rows.tsx`): Button shape (Pill / Rounded / Square → `--ft-radius-control`, the value behind `rounded-pill`); Depth (Flat / Soft / Lifted → `--ft-shadow-card` / `--ft-shadow-float`); Button glow (switch → `--ft-shadow-glow`); Page glow (switch, the radial accent wash on `body`); App font (Sans = Plus Jakarta Sans / Mono = IBM Plex Mono / System stack — overrides `--font-sans` on `html` and `body`; the passage keeps `--ft-font-family`); App size (Compact / Default / Large = root `font-size` 93.75% / 100% / 106.25%; everything in rem scales).
- **Layer rule:** `--ft-shadow-*` and `--font-sans` are declared on the unlayered `:root` / `.dark`, which outrank `@layer base`, so their overrides in the Style block carry `!important`. Vars declared only inside the block (`--ft-radius-control`) don't need it.
- **Scope rule:** every Style selector is written as `html[data-ft-x="v"], [data-ft-x="v"]:not(html)`, so a wrapper can preview a pick (the AI studio). Explicit default values have `:not(html)` rules for undoing a global non-default choice inside a preview; keep them in step with the `:root` / `.dark` tokens.
- **Preview:** `<StylePreview>` shows the real card, segmented switch, primary and outline buttons, input, floating menu and switch side by side.

## 22. Practice surface and result screen

The practice screen answers one question ("type this") and the result screen answers one more ("how fast was I?"). Orange marks your current selections, the caret and the headline number; every other number stays ink.

### 22.1 Mode bar (`mode-bar.tsx`, `mode-bar-controls.tsx`)
- **lg+:** one centred capsule (`rounded-pill border border-border bg-card/80 p-1 shadow-card`, the same capsule as the top-bar nav). It holds Mode (`<SegmentedControl framed={false}>`), Length (`<LengthPicker>`), Wordlist (a plain pill with a chevron that opens the catalog dialog) and Adaptive (one toggle pill, `aria-pressed`, a Lock icon when signed out, orange when on), followed by a ghost info icon button. Groups are separated by `mx-1 h-4 w-px bg-border` hairlines. No eyebrow labels: each group has an `aria-label`.
- Hand-built pills (the length presets, the Custom input, wordlist, adaptive) use `segmentClass()` from `mode-segment.ts`, which mirrors `<SegmentedControl size="md">` exactly. The Custom input, while you edit it, is an `h-8 rounded-pill border-primary/50` field.
- **Below lg:** one `h-11` summary pill ("Words · 25 · English", plus "Adaptive" in primary from md). It expands in place into a `rounded-2xl bg-card shadow-card` card with the groups stacked as full-width framed switches. This stack is the only place on the surface with small sentence-case captions (`text-xs text-muted-foreground`). Adaptive appears in the stack from md, where it is available.
- **Stack touch sizes:** every control in the expanded stack is 40px (`h-10` mode and length segments, wordlist pill and Adaptive toggle, inside the 48px framed track) and the Adaptive info button is `size-11`. The Custom length input there is `h-10 text-base`, so iOS doesn't zoom on focus. Quote lengths read Short / Medium / Long / Extra long on their own (length chips, pickers and race lobby toggles), and "Short quote", "Medium quote", "Long quote" and "Extra-long quote" inside a test name (`formatTestName`, §27; hyphenated because it comes before a noun). The data bucket "thicc" is never shown. In QUOTE the invisible wordlist placeholder keeps the capsule's `gap-0.5`, so the capsule is exactly the same width in every mode. The wordlist picker hides the raw wordlist id below sm (`hidden sm:inline`, still searchable) and uses 16px search text below sm.

### 22.2 Keyboard widget
- Pressed keys (react), the next key (next) and preview-forced keys are the only "hot" (orange) keys. With `highlightHomeRow` on, F and J carry a homing bump (`absolute bottom-1 h-0.5 w-2 rounded-full bg-current opacity-50`) instead of a permanent fill, so a real F/J press stays visible.
- `keymapSize` applies as CSS `zoom`, never `transform: scale`, so a smaller keyboard leaves no dead band.
- The "rounded" key shape uses `rounded-sm` (the theme radius scale); rows use `gap-1 sm:gap-1.5`.

### 22.3 Result screen (`test-summary.tsx`)
- **Order:** the headline card, the stat card, the actions, the analysis card (§22.3a), then the optional cards (Run details, Slowest letters and Hand split, Text heatmap). "Next test" therefore stays above the fold at 1280×720 whatever is switched on.
- **Headline:** speed (hero) over accuracy (lead), and from sm a two-row `<dl>`: **Test** ("25 words", "60 seconds", "Short quote", "Burst of 25 words", from `lengthLabel`) and **Word list** ("English"; none for quotes). The headline sits beside the chart in a `rounded-2xl border bg-card shadow-card` card. The headline column is `sm:grid-cols-[minmax(12rem,auto)_minmax(0,1fr)]`, so it grows with a long value instead of overflowing into the chart. On mobile, speed and accuracy sit side by side on a two-row subgrid (`grid-cols-[auto_auto]` + `row-span-2 grid-rows-subgrid` per stat): the labels share row 1 and the values are bottom-aligned in row 2.
- **Secondary stats:** Raw, Consistency, Errors and Time are a second card, `grid-cols-2 sm:grid-cols-4`. **Errors** counts every wrong key (the same number as the live readout, the share card and race results); the analysis calls one slip and its fix a *mistake*.
- **Result cards** (chart, stats, analysis, optional cards) carry `data-ft-result-card`, so Settings → Layout → Plain (`data-ft-result="spare"`) strips their outlines.
- **Burst runs:** every figure is timed on the tries themselves (from a try's first key to the key that ends it, the same clock as the live "last wpm"), not on the whole run. The hero is labelled "Burst WPM" (in the user's unit) and is the speed across the cleared tries (their characters over their time, not a mean of them). Under it sits a muted `text-sm` caption (`max-w-64`, spanning both columns on phones): "Speed across your N cleared bursts. Best X WPM." ("Speed of your one cleared burst." when there is one), followed by "Raw also counts the N tries that didn't clear." when some missed. Raw is labelled "Raw (all N tries)" and covers every try on the same clock. Consistency uses the cleared tries. The chart plots the running burst and raw speeds per second from second 1; seconds before the first cleared try repeat its value, so early misses still get their ✕ marks and ribbon bars. Burst figures are display only (bursts are never saved), and burst runs have no analysis card and no Slowest letters card. The maths and copy live in `burst-stats.ts` (tested); the try log lives in `burst-log.tsx`, above `<BurstProvider>`, so the results screen can read it.
- **Optional cards** are `<InsightCard>`s, all ink:
  - **Run details:** longest clean streak ("86 keys"), words typed correctly ("24 of 25", out of the words finished; a timed test ends partway through one) and longest pause between two keys (`secShort`). The figures sit on one line when a label wraps.
  - **Slowest letters:** the median time per key over clean gaps inside words (`letterGaps`; a word's first letter and the key after a mistake never count), letters with 3 or more gaps, top 8, in seconds ("0.14 s"), with the slowest bar `bg-foreground/70` and the rest `/35`.
  - **Hand split:** correctly typed letters by hand on QWERTY, as a two-tone ink bar with labelled ends ("Left 57%", "Right 43%") and an sr-only sentence. It shows only when the run's keys matched QWERTY (`codeMatch`). Without key-code evidence (the live clone, the settings preview, a run under 20 letters) it follows the on-screen keyboard's layout setting. Otherwise, and on touch input, it shows one muted line: "Hand split works with a QWERTY keyboard."
  - **Text heatmap:** a four-step ink ramp on the text colour (`color-mix(in oklch, var(--foreground) 55% / 70% / 85%, var(--card))`, then `var(--foreground)`), with the slowest step bold. The ramp was checked with the dataviz ordinal validator in light and dark: the fastest step is 4.6:1 against the card. A "Faster … Slower" legend sits underneath, and there is no per-letter hover title.
- **Chart:**
  - A numeric x-axis (`type="number"`, `domain={["dataMin","dataMax"]}`) with explicit ticks from `secondTicks(first, last)` (`chart-ticks.ts`) and `interval={0}`: at most four even gaps, always closing on the last second, never a crowded final pair.
  - A series that adds no data of its own (the ✕ Scatter) must not get a `data` prop: a copy of the chart data duplicates every x tick.
  - The raw trace is dashed muted and the average line is solid at `strokeOpacity 0.15`.
  - The tooltip label is two lines: "12 s", then "2 errors" in muted text when there were any.
  - The errors ribbon ("Errors over time", "N errors" or "None", no native bar titles) is inset to the plot area (`pl-10 pr-4`, the y-axis column plus margins), with thin `bg-destructive/70` bars at each second's x position.
  - A timed test's trace closes on its final second: a last sample is added when the timer ends, so a 15s test charts 1s–15s.
- **Actions** (`result-actions.tsx`, `data-no-export`), directly under the stat card: one `<Button size="lg">` "Next test" with RotateCcw and a translucent `<Kbd>tab</Kbd>` (sm+), full width on mobile, then ghost Replay / Save image / Share buttons (`h-11 sm:h-9`). Save image shows a failure label if the export throws.
- **Save image** (`result-export.ts`): captures the result body only. Children marked `data-no-export` (the mode bar, the actions, the analysis card) are filtered out, and the height is the sum of the exported blocks and their gaps (`exportHeight`, tested), so a no-export block in the middle never leaves an empty band. The capture is padded on a page-coloured canvas, with the flame + "flinttype" wordmark drawn underneath.
- **Replay** (`result-replay.tsx`): draws the run with the passage tokens (`--ft-passage-typed/-untyped/-error`), the passage font and spacing variables and the user's caret style (`InlineCaret`), at `text-2xl sm:text-3xl leading-[1.9]`. Errored words get the passage's past-error underline. The text box scrolls to keep the caret in view. The header reads "Replay" and "12.3 s of 31.0 s"; progress is a base-ui `<Progress>` with an ink indicator (`bg-foreground/60`), `aria-label="Replay progress"` and a spoken value ("12.3 of 31.0 seconds"). The speed switch is the shared `<SegmentedControl>` (orange selected pill). On phones the speed switch segments are `h-10` and Pause / Stop are `h-11` (compact from sm).

### 22.3a Result analysis (`src/app/_components/run-analysis/`)
- **One card**, `data-no-export` and `data-ft-result-card`, gated by Settings → Stats & results → Show analysis (on by default), never for burst runs. It is one region (`<section aria-label="Analysis of this test">`); its parts are plain blocks headed by h2s: "What happened", "Where the time went" and "Compared with your usual".
- **Layout:**
  - From lg the card is two columns, `lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr]`.
  - Top left: **What happened**, at most three findings, after a PB line when the run is a best.
  - Under it: **Compared with your usual**, or the sign-in line.
  - On the right, spanning both rows (`lg:row-span-2`): **Where the time went**. It has a `<MinuteBar>` of the test's real seconds and a one-column `<BudgetTable>` (clauses sr-only). Then comes "When nothing held you up, you typed at about N wpm." when the flow speed is 3 or more above the run's.
  - The DOM order is What happened, Where the time went, Compared with your usual, so phones stack in that order and screen readers read it in that order.
  - "How we measure this" closes the card at full width.
- **Runs that can't be broken down:**
  - A too-short run shows one line and no time column.
  - A run whose clock doesn't add up shows a timing note (plus any fixing or words-left finding) and no time column.
- **Partial views:** some views cover only part of the run: a live-clone window that starts after word 0, or a done frame cut at 3,000 keys. Such a view:
  - has no time column;
  - opens with "This shows only part of the test." and "It leaves out how the test started and ended, and any breaks.";
  - keeps only the findings its part can show: fixing, words left wrong, pauses before words and hesitations (`finding-items.ts`, tested);
  - never states breaks, start-up, slow-down, an even run or a timing note;
  - leaves the flow speed out of "How we measure this".
- **Findings:**
  - Each finding is a muted lucide icon, a `text-sm font-medium` lead and a muted follow-up, each one sentence from `finding-copy.ts`. Words appear in `<q className="font-mono">`.
  - A signed-in run whose top shown finding maps to an always-available drill gets a ghost `sm` "Practise with {drill}" link (`h-11 sm:h-8`). It never appears in a preview or the live clone.
  - The link sits under the findings' text column and is underlined in ink (`decoration-border`, primary on hover), so it reads as a link at rest.
- **One source, one analysis:** every provider supplies `runAnalysisSource`.
  - The real screen sets it before paint, from the run as played (`asPlayed`): Adapt forced off on a phone or when signed out counts as Casual.
  - The settings preview and the AI studio supply a fixed one (`preview-sample.ts`): one clock, a buffer rebuilt from the events, an empty run context, and the hero speed, raw and curve levelled to the speed a submit computes.
  - The live clone builds one from the broadcaster's settings over its frozen state (`clone-state.ts`, `clone-source.ts`). A done TIME frame keeps the broadcaster's word cursor, so Run details and the analysed words stop where theirs did.
  - `TestSummary` analyses the source once through `useRunAnalysis` (`src/app/_components/use-run-analysis.ts`) and passes the view down.
  - The test is named from the source's bucket: the kind of test it is stored and compared as.
- **Compared with your usual** (signed in, real result screen only): `insights.usual` is fired once in parallel with the submit and cached per run, so a remount never refetches.
  - **Ready:** a reference line naming the tests ("Against your previous 30 Adapt tests of 25 words."), then `<RangeTrack>` rows for Speed and Accuracy with "Inside / Above / Below your usual range". The track is spoken as "Your usual speed is between X and Y, and this test was Z.", or "about X" when both ends print alike, decided on the same printed figures the track shows (`rangeLabel`, tested). At most one slice line follows, with a `<DeltaText>`, when a part differs by 1.5 s a minute or more (only on a whole, well-paced test of 10 s or more, and never Fixing with backspace off). Adapt runs add a note.
  - **Learning:** "After N more … you'll see how this test compares with your usual."
  - **Loading:** one skeleton line (`aria-busy`).
  - **Error:** "Couldn't load your usual." with a ghost Try again.
  - **Missing analysis table:** nothing.
  - **Anonymous runs:** "Sign in to compare each test with your usual." with an underlined ink link.
  - The live clone and every preview never compare.
- **Colour:** nothing in the card is orange. The result screen's orange stays the hero speed and "Next test".
- **"How we measure this"** closes the card: four short paragraphs, and the only place the thresholds are described.

Rationale: the result answers "how fast" first and "why" second, from the same engine Insights uses. It adds no second spark and no server round-trip before the first paint, and a view that sees only part of a test never claims what it can't see.

### 22.4 Tab on the practice surface
Tab restarts (or retries the word in BURST) only while focus is on the page or the hidden typing input. Shift+Tab, and Tab from any focused control, do native focus traversal. On the result screen, Shift+Tab from the typing input jumps to the last result action, so Replay / Save image / Share are one keystroke away. Dialogs opened from the mode bar hand focus back to the typing input when they close, so the next Tab restarts. The Adaptive explainer modal moves focus to its Close button on open and keeps Tab inside the panel. Only the practice mode bar hands focus to the typing input. Elsewhere (the race lobby settings) the wordlist picker returns focus to the control that opened it, so the settings popover stays open. An Escape on the page that closed an overlay (cancelled by Radix) never also restarts the test. The tap-to-focus wrapper ignores events that bubble from portaled popovers, dialogs and sheets, so it never dismisses a popover or blocks text selection inside a dialog. In BURST, a Space from a phone's soft keyboard (an input event with no usable keydown) goes through the same threshold and reps gate as a keyboard Space (`burst-space.ts`).

## 23. Race screens (`/race`, `/race/c/[slug]`)

Every race surface sits in one centred `max-w-5xl` column (`<RaceColumn>`), the same column the practice surface uses, so no edge moves between practice and races. `<AppChrome compact>` owns the gutter. `<RaceBody>` routes by phase:

| Phase | What shows | Rules |
|---|---|---|
| Idle (queue, no room) | `<RaceLauncher>`, top to bottom: h1 "Race" and one line about racing; the mode as the shared `<SegmentedControl>` (orange selected pill, `h-10` segments below `sm`); a one-sentence mode description; `<Button size="lg">` **Find race** (the one filled primary); outline lg **Create private lobby** and an outline `icon-lg` settings gear; one muted summary line of the saved lobby settings ("Private lobby: Quote race, short to long", from `lobbyConfigSummary`). | Centred. Below `sm` it stacks full width inside `max-w-xs`; from `sm` the buttons sit in one row. No top strip (`<RaceControls>` renders nothing). While pending the button reads a disabled "Finding race…". Failures show in a **reserved** `min-h-5 text-sm text-destructive` line, so the centred block never jumps. |
| Lobby settings (gear) | Race type, then that type's knobs. Single choice uses `<SegmentedControl>`. Quote lengths (Short, Medium, Long, Extra long; the data bucket "thicc" is never shown) are `<Toggle>` multi-select pills (`aria-pressed:brand-surface`). Then lg **Create lobby**. | A popover on desktop and a `<MobileSheet>` on mobile, with 40px controls on mobile. The config is per browser (`useLobbyConfig`), shared by the editor and the launcher's summary line. The type-specific knobs sit in one `sm:min-h-36` block, so every race type has the same height and the desktop popover never flips sides mid-click. |
| Joining / next round (room handle, no snapshot yet) | One quiet status line with an orange pulse dot: "Joining lobby…" on a lobby link, "Starting the next round…" while a rematch reconnects. | Never flash the launcher between rounds. |
| Matching / lobby / countdown | The lineup card (status pill beside the mode name). In a private lobby, `<ChallengeLobby>` follows: the host gets lg **Start race**, plus outline "Force start now" while guests ready up. A guest gets lg **Ready up**, which becomes an orange-outlined pressed "Ready" once ready (never neutral grey). Both get the invite-link pill. In public matchmaking a single muted status line replaces the lobby block. The countdown digit takes the passage slot. | No poster repeating the mode. Start and ready failures show a destructive line under the button. A quiet ghost "Leave race" sits above the card. Touch targets are `h-11` below `sm` (Leave race, Force start, invite link). A quote race credits its source as "A quote from <source>". |
| Racing | The lineup card on top, the passage below. | Header stats: your WPM orange, words and accuracy ink (hidden for a watcher). The quote's author is named before the gun, not floated under the live passage. |
| Watching (no seat) | The lineup, then the spectator passage (app font, `rounded-sm` cursor highlight, the author directly under the text). | The racer picker shows only when more than one racer is still typing. The watched racer's cursor block and the picker dots follow the lineup's colour rule (their `playerColorFor` only with the player-colours setting on, otherwise ink). Picker chips are `h-11 sm:h-7`. |
| You finished, room still racing | The live surface at **natural height** (the spectator view), with the provisional results card directly below. | The body scrolls. Your place is above the fold at 1440×900. |
| Race over | **The results card first**, then `<PassageRecap>`: the passage wrapped in quiet ink (a timed race shows only the stretch that was reached: your cursor, or the furthest racer's for a watcher; `recapWords` in passage-recap-words.ts, tested), words left wrong in `text-destructive` with an underline (the word under the cursor counts only once it no longer matches the start of its target, so a correct half-typed word at the buzzer isn't marked), and the author right under it. | Card: `rounded-2xl p-4 sm:p-6 shadow-card`. WPM is the hero number (`text-6xl sm:text-7xl text-primary`); accuracy is large ink; raw WPM, characters, errors and time sit in a quiet `grid-cols-2 sm:grid-cols-4` row. The speed chart (`<RaceTrace>`, samples recorded client-side once per race second) shows your line orange and opponents in graded ink. A sample records which racers had already finished when it was taken, and the first finished snapshot adds one closing sample at the second the race ended (`closeTraceSamples`), because the last finisher, and everyone at a timed race's buzzer, never shows as crossed while the room is racing. So each line ends exactly at that racer's final speed, and "Your peak" is never below the result. **Rematch** is the orange lg CTA. Save image and Leave are ghost buttons (`h-11 sm:h-8`). Standings hide raw and accuracy below `sm`, and your row is `rounded-xl bg-primary/10` with orange rank and WPM. A rematch vote the server hasn't confirmed after 5s, or a failed image save, shows a destructive line. A **watcher** gets a standings-only card instead: "Race finished", an h2 naming the winner, and lg **Find a race**. The speed chart draws a solid zero baseline under its dashed rules. `<PassageRecap>` sits flush with the column edge (no inner padding). |

Every exit (the Leave race strip, Leave on results, Find a race) goes through `useLeaveRace`: it drops the seat, clears a private lobby's cached host handle and lands on /race. Keyboard: `<TabFocusGuard>` swallows Tab only during the countdown and while you're racing. Escape restarts your passage only while you're racing. Wherever race input is locked (matching, lobby, countdown, after you finish, results), both the hidden input and the page-level handler ignore it, so the results and the recap built from your run stay intact. In every other phase, Tab does native focus traversal even when focus starts on the hidden typing input.

Rationale: one obvious primary action per phase, orange for every selected or primary state, your place above the fold the moment a race ends, and no screen without a way forward.

## 24. Insights page (`/insights`)

The page answers "how am I doing, and what should I do next?" first, for a 45 wpm typist and a 250 wpm typist alike. Components live in `src/app/insights/_components/`; shared pieces live in `src/components/analysis/` (§27). One `insights.overview({ bucket? })` call feeds everything except the playground, and it never calls Clerk. All copy comes from the tested `*-copy.ts` modules beside the components (`insights-copy`, `verdict-copy`, `next-step-copy`, `barrier-copy`, `change-copy`, `habit-copy`, `trend-copy`, `labels-copy`), never inline.

- **Header:** h1 "How you type", no eyebrow, and one line naming the tests it is based on ("Based on your last 30 Adapt tests of 25 words.").
  - **Bucket picker.** With two or more kinds of test, a picker sits in the `aside`. It is an outline button showing the mode (muted) and the length (medium weight), with no glyph between them. It opens a dropdown of checkbox items (a `<MobileSheet>` on phones).
  - **URL.** The choice lives in the URL (`?tests=`, "~" for "|"), written with `history.replaceState` so a switch never reloads the page. The default is left out.
  - **Switching.** The picker shows a new choice at once. The content below stays at 60% opacity with `aria-busy` until its overview lands.
  - **Failed switch.** The picker and the URL go back to the tests on show. One `text-sm text-destructive` line above the content names the kind ("We couldn't load your Casual tests of 60 seconds."), followed by the same line the error card would show, then Try again. Signed out, that line is a link to sign in.
- **Order:**
  1. the verdict card;
  2. Where your time goes;
  3. What would help most beside What changed (two-up);
  4. Where it shows (letter pairs beside words);
  5. Your speed over time;
  6. Your habits;
  7. Try any text (collapsed);
  8. footer links.
- **Verdict card:** one `<Surface>`, split in two from md.
  - **Left:** "Your usual speed" as an ink hero number (proportional figures), then a `<RangeTrack>` (usual range, with the last test as the dot). Then a `<TrendWord>` (Improving, Holding steady, Levelled off, A little slower lately, Early days) with one sentence. A range whose ends round alike reads as one figure. For Adapt, a note says speeds allow for passage difficulty (from md; on phones it sits under the chart).
  - **Right:** "Your next step": a title and a "because" sentence in seconds or the speed unit. Then the page's **one** filled `lg` primary naming the drill ("Start Tongue-twister gauntlet") or "Take a test", and a ghost "Other ways to practise". A locked drill is never linked. Without the detailed analysis (not ready), the reason makes no claim about pauses or fixes.
  - **Fixing step.**
    - It says "Fix mistakes faster", with a letters-per-mistake comparison, only when each fix now costs more than usual.
    - Otherwise it says "Spend less time fixing mistakes" and gives the seconds a minute against better days.
    - An earlier mistake rate that rounds to 0 reads "almost none".
- **Where your time goes:** two `<MinuteBar>`s on one 0–60 s scale ("Your recent minute", "On your better days", with 0 s, 30 s and 60 s ticks) and a `<BudgetTable>`.
  - Table rows: Typing, Fixing mistakes, Pauses before words, Hesitations inside words, Breaks. Columns: Recently and Better days.
  - The slice the next step targets is the page's only orange data mark.
  - Each minute sums to 60 s.
  - While fewer than 5 tests are analysed (learning), the last test's table gives Breaks and Fixing clauses that name no threshold and no fix mode ("Long stops, and the wait before your first key in a race.", "The extra time your mistakes cost you."), because that minute carries neither.
- **What would help most:** at most three rows, ranked by the time you could get back. Each row shows:
  - evidence against better days ("About 4.5 seconds of every minute now. On your better days, about 1.2 seconds.");
  - a `<ComparisonTrack>`;
  - one coaching line;
  - "Worth about N to M wpm".

  Row one says "This is your next step." (no icon) instead of repeating the button. The fixing row calls fixes slower only when each one costs more than usual. Otherwise it says what the time per fix shows ("Each fix takes about as long as usual.").
- **What changed:** at most three `<ChangeRow>`s that passed a noise gate (sessions counted as clusters), improvements first. When none pass, a dashed card says nothing has changed enough to call it real. When one side has nothing to show yet, the other spans both columns and the missing side becomes one muted line under it.
- **Where it shows:** letter pairs, and words that are slow for their length (timed on words typed without a mistake).
  - **Ranking.** Both lists are ranked by the model's careful extra time, so the bar, the figure, the order and the drill agree. The count column is "Times measured".
  - **Key column.** It fits the longest key: up to 16 characters on phones, 18 where the two cards sit side by side (lg to xl), and 24 otherwise. On phones each figure sits above its ink bar.
  - **Tiny figures.** An extra time that rounds to nothing reads "under 0.01 s".
- **Speed over time:**
  - **Marks.** A usual-range band, a rolling-median line and faint test dots, all ink. Personal bests are solid dots.
    - The line and band are drawn through each day's last test, and only from 2 points.
    - At most 5 round y ticks.
    - Date ticks are spread evenly in time, one per day, never closer than a sixth of the span, and about one per 96px of chart (2 to 5, so 3 on a phone).
  - **Tooltip.** It judges each dot against the usual range as it stood at that point: "Inside your usual range at the time". Dots before the band starts get no range line.
  - **Range switch.** 1M | 3M | All. The default is 3M, or All below 30 tests or when the last 3 months hold fewer than 2 points. It resets for each kind of test.
    - With one test (or day) in the range, one muted line replaces the chart.
    - With none, "No tests in this range yet."
  - **Adapt.** Dots sit at the speed adjusted for passage difficulty, and the page says so.
    - No dot is marked as a best, because bests are typed speeds.
    - The tooltip gives "N wpm allowing for difficulty" and "N wpm typed".
    - The field reads "Best typed speed".
  - **Long histories.** Above 150 tests each dot is a day, the middle of that day's tests. The legend says "Middle of a day's tests", and the tooltip gives the day without a time. The table's first column is "Day". A personal best keeps a row of its own, marked under its date.
  - **Table.** A "Show as a table" disclosure is the table view (the chart itself is `role="img"`).
- **Your habits:** `<QuestionRow>`s (question, answer, evidence, "How we know"). Only habits with enough data render. The rest are listed under "More answers as you practise".
  - Each count names what it counts, so it always moves: "After 4 more tests of 30 seconds or more.", "After 2 more tests where you fix a mistake."
  - When this kind of test never runs 30 seconds, pace to the end says so once instead of counting.
- **Try any text:** a native `<details>`, collapsed. The playground mounts only once it is opened, so a visit never spends the scoring budget unasked.
- **Copy:**
  - Felt units only, and no zero figures.
  - No milliseconds outside disclosures.
  - No percentage comparisons other than accuracy itself.
  - No "·" and no em dashes.
  - Every comparison names its reference.
  - A claim the data doesn't support (a slower fix, a slower pause) is never printed.
- **States:**
  - **Loading** is a skeleton shaped like the sections.
  - **A bucket switch** keeps the previous content at reduced opacity.
  - **Empty** is one card with `<LearningSteps>` and "Take a test".
  - **Learning** (1–4 tests) shows the last test and the steps.
  - **Not ready** (the analysis table is missing) still shows speed, trend, habits from tests, and practice lists. The time section shows one muted line, and the What would help most / What changed row is left out rather than repeating it.
  - **Error** is a dashed card with "Error code: X" and Try again (or Sign in).
- **Footer:** "See the technical view", "Browse drills" and "Delete my typing analysis", spaced with no glyph. Delete opens a confirm dialog, and its errors show inside the dialog.

Rationale: one picture (where the minute goes) carries the diagnosis. Every number is relative to the person's own pace and history, and says what it is (a test or a day, adjusted or typed, then or now). Every visit ends with one clear step.

## 25. Drills (`/drills`, `/drills/[id]`)

Drills answer one question: what should I practise next. Components live in `src/app/drills/_components/`.

**Data layer** (pure, unit-tested where it has logic):
- `drill-catalog.ts`: the shared tuning numbers, and the title, kind label and one-line `about` for every fixed drill id. The builders and the runner's page metadata both read it, so names can't drift.
- `drill-lists.ts`: the curated lists.
- `drill-generators.ts`: the seeded pickers.
- `drills-tailored.ts`, `drills-isolation.ts` and `drills-generic.ts`: build the specs.
- `drills-data.ts`: the `DrillSpec` types and `buildDrills`.
- `drill-tiles.ts`: view logic (recommendation, isolation folding, locked-last order, filters, visible filters).
- `drill-spec-line.ts`: unit names and the spec line.
- `burst-reducer.ts`: the burst engine.
- `use-drills.ts`: the one loader both pages share. It retries a first UNAUTHORIZED once, quietly, because a fresh tab can fire before Clerk refreshes its session cookie.

**Copy:** tailored drills call their ranked pairs and words "weakest", never "slowest", the same as Insights (§24), since both lists are ranked by the weakness score.

### 25.1 Index layout
`<PageShell>` → `<PageHeader title="Drills">` with a neutral "N ready · N locked" pill in `aside` (`h-8 rounded-pill border bg-card text-xs`) → the **Recommended tile** → a filter + sections group (`flex flex-col gap-6`; sections `gap-10 sm:gap-12`).

- **Recommended tile** (`recommended-drill.tsx`)
  - Full width, and the page's orange accent: `rounded-2xl border-primary/30 bg-linear-to-br from-primary/10 via-card to-card shadow-card`.
  - A `text-primary` flame eyebrow "Recommended for you", an h2 title, a one-line summary, a neutral kind badge + spec line, and the page's one filled `buttonVariants({ size: "lg" })` "Start drill" (full width on phones).
  - It is the first ready tailored drill, never an isolation drill, and it is left out of the grid.
  - It **follows the active filter**: hidden when the filter excludes it (`showRecommended`).
- **Filter**
  - The shared `<SegmentedControl>` (§17.2); the selected option is the orange `brand-surface` pill.
  - Touch targets come from the segments, not the shell: `max-md:p-0.5 max-md:[&>button]:h-11` (44px segments, 50px control) on phones, `md:h-10` from md.
  - On phones it sits in an `overflow-x-auto -mx-4 px-4` wrapper so it scrolls sideways to the screen edge.
  - It offers All, the active option, and only options that narrow the page: some drills but not all, counting the recommended tile (`visibleFilters`). With fewer than two options it hides.
- **Sections**
  - `<PageSection>` "Tailored to you" and "For everyone", each a `<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">`.
  - The tailored description adds "Locked drills open up as you practise." only when something in the group is locked.
  - An empty filter result shows a dashed card with a "Show all drills" outline button.
- **New account (every tailored drill locked)**
  - "For everyone" renders first.
  - Tailored collapses to one `<LockedSummary>` row instead of a column of locked cards, so drills the user can start today lead.
  - The row is a dashed `rounded-2xl` card with a Lock badge, "N drills unlock as you practise", the drill names, and an outline "Go practise" (`h-11 sm:h-9`).

### 25.2 Drill tiles (`drill-tile.tsx`)
- **Ready tile**
  - The whole card is the `<Link>`, with no trailing arrow (§17.5).
  - Styling: the `<Surface>` recipe + `hover:border-foreground/20 hover:shadow-float motion-safe:hover:-translate-y-0.5` + `focus-visible:ring-3 ring-ring/40`.
  - Content: neutral kind badge, title (`text-base sm:text-lg font-semibold`), summary (`line-clamp-2 max-sm:hidden`), and a spec line pinned to the bottom (`mt-auto text-xs tabular-nums text-muted-foreground`).
- **Kind badge**: `h-6 rounded-pill bg-muted px-2.5 text-xs text-muted-foreground` with a lucide icon (Skull = sudden death, Zap = burst, Target = isolation). Never coloured, so the recommended tile keeps the orange.
- **Locked tile**: same geometry, `border-dashed bg-card/40`, no shadow, and inert (`aria-disabled`, not focusable). It has a "Locked" badge and a summary saying what unlocks it. Locked tiles sort last.
- **Isolation tile**: every `isolation-<pattern>` drill folds into one "Isolate weak spots" card (`ISOLATION_TILE_TITLE`; it holds letter pairs and triples, summary "Pick one to start"). Its body is a wrap of 44px outline pill chips, one per pattern, each linking to its drill. A cold model gets one locked tile instead.

### 25.3 Runner (`/drills/[id]`)
`page.tsx` is a server component wrapping the client `<DrillRunner>`. Every state renders in the practice column (`mx-auto max-w-5xl`), so header, passage, stats and keyboard share the practice page's edges. Metadata comes from `drill-catalog.ts`, and every runner page is `noIndex` (drills need an account; SEO S8).

- **`<DrillHeader>`**
  - One row, no border: a ghost back button (`size-11` icon-only on phones, `sm:h-9` labelled "Drills", `-ml-3` so the icon meets the column edge), a `h-6 w-px bg-border` divider, then the kind (`text-xs text-muted-foreground`) over the h1 (`text-lg sm:text-xl font-bold`).
  - Without a `title`, only the back button renders.
- **States**
  - **Loading** is a header + passage-shaped skeleton.
  - **Error, signed-out and 404** render the bare header plus a centred notice whose heading is the page's h1. There's no eyebrow and nothing repeats the heading, and a raw error message shows only when it adds information. The 404 truncates ids past 40 characters and uses `wrap-anywhere`.
  - **Locked** keeps the drill's header and puts an h2 in the notice.
  - Primary actions are the flame `size="lg"`; secondary actions are `outline` `size="lg"`.
  - Runner headings (notices and the clear screen) carry no trailing period.
- **Typing on phones**
  - Every runner focuses a visually hidden in-flow input (`pointer-events-none fixed bottom-0 left-0 size-px opacity-0`, `aria-label="Typing input"`) when the typing area is tapped.
  - Sudden death uses `<InputCapture>`. Its body prevents the default of `mousedown` on non-interactive targets, otherwise the browser takes focus straight back off the input.
  - Burst drills use `use-burst-typing.ts`: window `keydown` for physical keys, a native `beforeinput` listener for soft-keyboard text and deletes, and an input-value diff for IME composition. Never use React's `onBeforeInput` for this: it is backed by `textInput` and has no `inputType`.
  - Before focus on a phone, the status line reads "Tap to type"; sudden death's footer reads "Tap the words to type".
- **Burst readouts** (`burst-stats.tsx`)
  - A centred row of `rounded-xl` stat cards: "60 wpm / Target", "2/5 / Streak", "3/40 / Word|Cluster|Sentence" (Burst 1000: "x/1000 / Discovered") and Accuracy.
  - No bracket hairline or uppercase caption.
  - Pips are `rounded-full`.
  - The status line reads "Type the word", "Space to commit" (orange), "Hit", "Too slow" or "Miss".
  - Feedback is colour only: no looping pulse anywhere on the runner (§13.1). Burst 1000's grid lights this session's words `bg-primary` and earlier ones `bg-primary/60`, statically.
- **Clear screen** (`drill-cleared.tsx`): shared by both kinds. An orange "Drill clear" eyebrow, an h2, two stats in a `<dl>`, an orange "Run again" and an outline "Back to drills" (both `size="lg"`). XP is granted once per visit. On Burst 1000, Run again picks the next 30 undiscovered words.

Rationale: one obvious next step, filters that never dead-end, usable drills before locked ones, and runners that a phone can actually type into without moving any edge from the practice page.

## 26. Changelog page (`/changelog`)

`/changelog` renders `public/CHANGELOG.md` grouped by **day**. The page-only helpers live with the route in `src/app/changelog/_components/changelog-days.ts` (`groupChangelogByDay`, `splitRecentDays`, `groupDaysByMonth`, `previewReleases`, `versionRangeLabel`; tested); `src/lib/changelog.ts` keeps the shared parser, version helpers and line filter (`parseChangelog`, `compareVersions`, `changesSince`, `isInternalLine`). One `<EditorialSection>` per date: h2 = the date in a `<time>`, `meta` = the muted version range (`v6.137.0 – v6.148.7`, a `v` on both ends), plus a `bg-primary/10 text-primary` "Latest" pill on the newest day. Inside a day each release keeps a small sub-head (`h3`, `text-xs font-semibold tabular-nums text-muted-foreground`, e.g. "v6.148.7") over its bullets. A line already listed by a newer release that day isn't repeated; lines starting with "Internal" are dropped, and so are releases and days left empty. Only the newest whole releases up to about 8 bullets show open; the rest of the day folds behind one "Show N more changes from this day" `<Fold>` (`release-list.tsx`: `rounded-2xl border bg-card shadow-card`, 48px summary row, rotating chevron), so a busy release day never becomes a wall. Days within 30 days of the newest release are open; older ones fold into one `<Fold>` per month, where each day is a single merged list without release sub-heads. Inline `**bold**` and `` `code` `` render as `<strong>` / `<code>` (`inline-markdown.ts`, tested), never as literal markers. Update-card links ("Read the update: …") hang off the day that contains a covered version. The file format stays untouched; the raw file is linked as `/CHANGELOG.md` (the exact file name, since static hosts are case-sensitive). The What's new dialog applies the same `isInternalLine` filter (`src/lib/changelog.ts`, shared by both), so internal-only releases never appear in it.

## 27. Analysis displays and copy

Applies to the result-screen analysis, `/insights` and any future analysis surface. Shared components live in `src/components/analysis/` (§5 rows); copy helpers live in `src/lib/format-figure.ts`, `src/lib/test-name.ts` and `src/lib/copy-rules.ts` (which also flags "% vs ").

1. **Three kinds of number.**
   - *Exact* figures (a test's time split, mistake counts, the longest pause) are stated plainly.
   - *Estimates* (usual ranges, time you could win back, the Adapt adjustment) are rounded and carry "about" or a range.
   - *Claims* (something changed, levelled off, a habit) appear only after their test passes; before that, show what more practice is needed, as a count.
2. **Units people feel.** Use seconds ("4.5 seconds a minute", "0.14 s each time"), the user's speed unit, counts, "1 in 5", and "about as long as typing 4 letters". Never a percentage of a time, "% over", "% to", or "N / M" as progress. Milliseconds appear only in the technical view and disclosures, never in a hover title (`title=`) on an analysis surface.
3. **Name the reference.** Every comparison says what it is against: "your usual Adapt tests of 25 words", "your better days", "the 30 tests before". Never compare across modes, lengths, input kinds or fix settings. Words like "most", "usually" and "every" claim a share or a rule: use them only when the test behind the line measures exactly that, otherwise write "more often" or "especially".
4. **Ink for data, orange for action.** At most one data item per view may be orange: the one the primary action addresses. No green or red states. Direction is an icon plus a word.
5. **Describe behaviour, not people.** Write "You pause before long words", never "You're a hesitant typist". No medical, psychological or character words. No reassurance the data can't back ("it usually passes", "it evens out with practice"): say what was measured.
6. **One idea per sentence,** ≤ 20 words, sentence case, UK spelling, no em dashes, no exclamation marks, at most one hedge word. `bannedPatterns()` enforces the mechanical rules in tests.
7. **Every analysed figure that isn't a plain count has a "How we measure this"** within reach.
8. **Literature figures** (population speeds, typical ratios) appear only inside disclosures as context, never as targets or as "typical for you".
9. **Test names** come from `formatTestName` ("25 words", "60 seconds", "Long quote", "Extra-long quote", "Adapt tests of 25 words"). Never "thicc".

Rationale: people act on findings they trust, and trust comes from numbers that are honest about what they are.

## 20. Amending this document

When you introduce a new pattern:

1. Open this file.
2. Add a row to the matching table (§2 color, §3 spacing, §4 typography, §5 layout, §12 settings, §13 animation, §14 identity marks, §15 minimisation knobs, §16 command palette, §17 social controls, §18 profile, §19 update cards, §21 shape/depth, §22 practice, §23 races, §24 insights, §25 drills, §26 changelog, §27 analysis displays and copy) **or** a new section with the next sequential number.
3. Include a one-line rationale — why this pattern, what problem it solves.
4. Commit the doc change **in the same commit** as the code using it.
5. From that commit forward, all UI must follow the new rule.

---

## LLM checklist before submitting a UI change

- [ ] Did you check §§2–5 for existing conventions? If empty, did you add the rows you're using in the same commit?
- [ ] Every color class has its `dark:` pair defined in §2?
- [ ] Reused shadcn / existing components instead of building new ones (§1)?
- [ ] **Authored mobile-first (§10):** unprefixed classes work at 375 px, `sm:` / `md:` / `lg:` only scale up?
- [ ] **Verified at 375 px AND ≥ 1024 px in a real browser before shipping (§10.3)?**
- [ ] Touch targets on primary actions ≥ 44 px (§7, §10.2)?
- [ ] Every async action surfaces loading + success + error (§6.3)?
- [ ] Labels and focus states preserved (§7)?
- [ ] Backend calls go through `useBackend()` / `safe()`, types imported from `src/types/` (§8)?
