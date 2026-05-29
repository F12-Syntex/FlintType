# UI Law

The authoritative design document for this project. Every UI change must conform to the rules below.

flinttype is **editorial-mechanical**: a single coral/ember accent used sparingly against a paper-and-ink palette in JetBrains Mono. Hairline borders, **interactive surfaces use `rounded-md`** (the project's `--radius-md`) for a consistent visual rhythm — buttons, nav links, hover backgrounds, popovers, the mode-bar segment, the keyboard keycaps. Tabular numerics on every stat. Charts are line-art SVG. The keyboard panel itself sits on the page background (`bg-background`) so the keys read as the figure, not the panel. The brand bias is still mechanical, not pillowy: keep the radius small. If you find yourself reaching for `rounded-xl` or larger on a control surface, stop — bump the project-wide `--radius` in `globals.css` instead, so the change applies to every component at once.

**Mobile-first is not optional.** Section 10 mandates every UI be authored for 375 px first and scaled up. The flinttype design source is desktop-first (1440 px artboards) — translate by stacking columns and reducing density on mobile, never by leaving small viewports broken.

## The Meta-Rule

> **Any new pattern not already in this document must be added here *first*, then adopted in code — in the same commit.**
>
> - If the convention exists below: use it exactly as specified.
> - If it doesn't: open this file, add the row/section with a one-line rationale, and ship it alongside the code that uses it.
> - Retroactive documentation is how inconsistency creeps in. The document leads; the code follows.

If you reach for a color, spacing value, typography class, or layout pattern that isn't in this document, **stop and amend the document**.

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

**Exception: pure reducers / helpers inside an `_components` file may still be tested.** A reducer is a pure function — even when it lives next to `useReducer` inside a `.tsx` module, calling it with a `State + Action` and asserting the output is exactly the kind of deterministic check the automated suite is for. The rule blocks *render-tree* tests, not pure-logic tests. Co-locate the test next to the module (`practice-state.test.ts` next to `practice-state.tsx`), mock the module's React-side imports (`@clerk/nextjs`, etc.) in the test, and import only the pure exports (`reducer`, `initialState`, etc.). Live precedent: `src/app/_components/practice-state.test.ts`.

Mirror-rule in `docs/backend-rules.md` R12 exclusions table.

---

## 2. Colors

**Use the theme-aware semantic classes defined in `src/app/globals.css`. Never inline arbitrary hex.**

The semantic classes (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`, …) are defined once for light (`:root`) and once for dark (`.dark`) in `globals.css`, with per-palette overrides in `themes.css`. They swap automatically with `<ModeToggle>` (light/dark) and `<ThemeSwitcher>` (palette). Reach for them by default — every product surface should follow the user's chosen theme.

**One accent, used sparingly.** The brand coral lives in `--primary`. It flags the user's gaze: the next-expected key, the active CTA, peak/stall callouts, an error word. If two primary-coloured elements compete on screen, drop one to ink or muted. The whole product reads as paper-and-ink with a single spark.

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

**JetBrains Mono everywhere.** Loaded via `next/font/google` in `src/app/layout.tsx` as `--font-mono-primary`, applied to `body` and `html`. Weights in use: 300, 400, 500, 600, 700, 800. Tabular numerics on every stat (`tabular-nums`).

No proportional sans, no serif, no second face. The mono is the design.

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
| Error text (form)     | `text-sm text-ft-ember`                                                                |
| Error word (passage)  | `text-ft-ember underline decoration-ft-ember underline-offset-[6px] decoration-1`      |
| Error letter (active word, passage) | `text-[var(--ft-passage-error,var(--destructive))]` plus one of four stacked cues, controlled by `appearance.mistakeStyle` (Customise → Appearance → Mistakes): `color` (hue only — quietest), `bold` (`font-bold` — default; mono is width-stable so caret unaffected), `underline` (`underline decoration-2 underline-offset-[6px]`), `highlight` (`rounded-sm font-bold` + inline `bg-[color-mix(in oklch, var(--ft-passage-error,var(--destructive)) 20%, transparent)]` — loudest, prior shipping default but read as too strong). Past errored words use the underline row above; this is the equivalent (configurable) cue for in-progress mistakes. |

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
| Page shell                | `min-h-screen bg-zinc-50 font-sans dark:bg-black`                                              |
| Centered column           | `mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:gap-10 sm:px-8 sm:py-20`                  |
| Card                      | `flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5` |
| Inline row (desktop-only) | `flex items-center gap-3`                                                                      |
| Stacked row → inline      | `flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3`                                     |
| Button group (wrappable)  | `flex flex-wrap gap-2`                                                                         |
| Topbar (sticky header)    | `sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80` |
| Topbar inner row          | `mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-8 sm:py-4`          |
| List row (long text + action) | `flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between` |
| App shell with sidebar    | `grid h-full grid-cols-1 lg:grid-cols-[var(--app-rail-width)_1fr] lg:gap-3` — used by `/customise` and `/leaderboard`. `--app-rail-width` lives in `globals.css`; the `<TopBar>` reuses the same grid template (`[var(--app-rail-width)_1fr_auto]` with matching `lg:px-6`) so the logo column aligns with the sidebar and the nav aligns with the content card. |
| Auth centered card        | `flex min-h-screen items-center justify-center bg-background p-4` outer + `w-full max-w-md` inner column with a `rounded-md border bg-card` card holding header (logo, eyebrow Tag, h1, description) + body (form children), and an alt-link sentence below. Used by `<AuthShell>` (`/sign-in`, `/sign-up`). Card animates in with `animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500`; the trailing alt-link uses the same animation with `[animation-delay:200ms] [animation-fill-mode:both]`. Apply `safe-pt safe-pb` to the page main so iOS notches/home-indicators don't clip. |

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
- Never rely on color alone to convey state — pair with icon or text.
- **Touch targets ≥ 44×44 px** on any viewport a phone might load (i.e. unconditionally). Use shadcn `Button` `size="default"` (`h-9` + horizontal padding clears the finger target on mobile once it's the full-width stacked CTA; on dense inline toolbars, keep `size="sm"` but reserve those for secondary actions, not primary CTAs). Icon-only buttons set `size="icon"` and override to `h-11 w-11` on mobile (`h-11 w-11 sm:h-9 sm:w-9` if you want them compact on desktop).

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

**Also test at a short viewport.** A laptop at 1080p with Windows display scaling at 150% (the common config) is ~720 CSS px tall, not 1080. Surfaces that pack chrome + a large typography ramp + a tall widget (the practice surface is the canonical case: TopBar + ModeBar + Readouts + Passage + Keyboard + Footer) can collapse the flex-1 region to one line at that height. Open DevTools, resize to a 1280 × 720 window, and confirm the layout doesn't collapse. Any surface whose `lg:` typography bump is too aggressive for short viewports must gate that bump on a `[@media(min-height:NNNpx)]:` arbitrary variant — see the practice passage in `src/app/_components/passage.tsx` for the canonical pattern. Same goes for fixed-height widgets that compete with `flex-1` content: the practice keyboard auto-hides under `[@media(max-height:750px)]:md:hidden` when there isn't honest room for both.

**Live readouts ride with the centred text, not pinned to the top.** The desktop practice readouts (WPM / ACC / ERR / WORD / ELAPSED) render through `<Passage above={…}>` — an optional slot inside the passage's own `justify-center` column, directly above the clipped text — so the {readouts + text} group centres together rather than the strip floating at the top of the surface while the text sits in the middle. The slot's height is reserved from the passage's line-fit calc (`outer.clientHeight − aboveRef.offsetHeight`) so the group never overflows or clips a line. The slot is `hidden md:block` (desktop only; mobile readouts live in the `<RestHint>` footer, where `display:none` collapses the slot to 0 reserved height). Don't reintroduce a top-pinned readouts row above the centred passage.

### 10.4 Amending §§3 and 5 for mobile-first
When you add a new row to the spacing or layout tables:
- If the value might ever differ between mobile and desktop, write the pair inline: `py-10 sm:py-20`. Don't ship a single-value row "for now" and plan to revisit — future-you will forget.
- If the value is genuinely viewport-independent (icon size, input border), a single value is fine.

### 10.5 Pickers on mobile use a bottom sheet, not a popover

Any popover or dropdown that hosts a list of choices (theme picker, font picker, colour picker, section picker, import-source picker, …) must render as a fixed-height bottom-anchored modal on mobile. Reach for `<MobileSheet>` from `@/components/ui/mobile-sheet` — it portals to `document.body`, slides up from the bottom edge with a 220 ms ease-out transform, locks at `h-[75dvh]` every time, paints an iOS-style grab handle, fades a dimmed backdrop, and provides a header bar with a close affordance. Touch the iOS home-indicator inset via the built-in `safe-pb`.

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
| `<Logo>`     | `from "@/components/ft"`        | The flinttype brand mark. Renders the flame SVG (`/flinttype-logo.svg`) + `FLINTTYPE` wordmark + optional `version`. `dark` flips the version-text colour. `size` (`sm \| md`) shrinks for footer use. Anchored as a `<Link>` to `/` (or `/app` when `dark`). |
| `<TopBar>`   | `from "@/components/ft"`        | Sticky app header — backdrop-blurred, 56 px tall. Renders `<Logo>` + optional desktop nav (md+) + `right` slot + mobile hamburger that opens `<MobileNav>` drawer. `dark` flips to ink-on-paper. `sticky={false}` for non-sticky uses.                              |
| `<MobileNav>`| `from "@/components/ft"`        | Hamburger button (md:hidden) that opens a full-width drawer below the header. Drawer shows nav links (large touch targets) + `drawerExtras` slot. Closes on route change, on `Escape`, or on hamburger toggle. Body scroll locked while open. Used by `<TopBar>`.   |
| `<IdentDot>` | `from "@/components/ft"`        | Right-side status indicator: text label hidden < `sm:`, dot always visible. `emberDot` variant for the race screen (live indicator). Pass as the `right` slot of `<TopBar>` on `/app/*`.                                                                           |
| `<Tag>`      | `from "@/components/ft"`        | Eyebrow / hairline label. Tone: `dim` (default), `ink`, `ember`, `ok`.                                                                                                                                                                                             |
| `<Stat>`     | `from "@/components/ft"`        | Labelled tabular value with optional delta + suffix. Sizes `sm \| md \| lg \| xl`. `accent` paints the value primary (coral); `bordered` adds a right divider for stat strips.                                                                                     |
| `<Panel>`    | `from "@/components/ft"`        | Bordered surface with `title` + `subtitle` header (both via `<Tag>`), background `bg-[#FAF7F0]`. Used for every dashboard widget.                                                                                                                                  |
| `<Kbd>`      | `from "@/components/ft"`        | Inline keycap chip: white bg, double-bottom border, mono small caps.                                                                                                                                                                                               |
| `<FtButton>` | `from "@/components/ft"`        | Square-cornered, uppercase, mono, tracked button. Variants: `ink`, `ember`, `ghost`, `ghostDark`. Sizes `sm \| md \| lg`.                                                                                                                                          |
| `<Avatar>`   | `from "@/components/ft"`        | A user's Clerk avatar — circular, hairline `ring-foreground/10`, sizes `sm \| md \| lg \| xl`. **Desaturated at rest, full colour on hover** of an ancestor `.group` (`liven={false}` opts out). Optional presence dot: `status="live"` (the lone coral spark, `motion-safe:animate-pulse`) / `"online"` (`bg-ft-ok`). Plain `<img>` (Clerk's CDN isn't in `next.config` remotePatterns and that file is off-limits). **Avatars are a sanctioned departure from the no-avatars bias — only the friends/live surfaces (§17.5) use them; do not sprinkle avatars onto other product chrome.** |
| `<UserTag>`  | `from "@/components/ft"`        | Identity tag chip — lucide icon + uppercase label with per-tag colour/border/fill/glow tokens. Variants: `tag ∈ { owner, whitehat, og }`. Sizes `sm` (leaderboard row, h-5/text-[10px]) / `md` (profile hero, h-[26px]/text-[11px]). Hover (and focus) shows a Monkeytype-style two-line tooltip with the tag's name + one-line description; opt out with `tooltip={false}` only when the chip is itself inside an outer button whose own affordance already describes it. Icons use lucide-react with `strokeWidth={2.25}` so the glyph reads at 12–14px against the saturated fill. Static glow, no animation. Tokens are fixed across palettes (§2.3 User-tag tokens). Requires the root `<TooltipProvider>` in `src/app/providers.tsx`. |

The shadcn `<Button>` is still preferred when the form/dialog already uses shadcn primitives — but flinttype-themed CTAs (the editorial buttons in screen designs) use `<FtButton>`.

**Brand mark.** Always render via `<Logo>`. The flame SVG at `/public/flinttype-logo.svg` is the single source of truth — never hand-roll a square/diamond mark inline. An older rotated-square glyph appeared in early commits; it has been replaced everywhere.

**Top-bar control height** — every interactive control in the `<TopBar>` right slot (sign-in pill, profile trigger, notifications bell, settings gear) is **`h-9` / `size-9` (36px)** so the cluster reads as one row of equal-height controls beside the nav segmented card (which lands at ~36px via `p-0.5` + `py-1.5 text-[13px]`). Pin the height with `h-9`/`size-9` — never let it be driven by `py-*` + intrinsic text/avatar size, which silently produces a short control (the sign-in pill once rendered ~24px this way). Bordered segmented chrome that can't hit exactly 36px on the Tailwind scale without an arbitrary value (the `<ModeSwitcher>` icon toggle at `size-8` + border ≈ 34px) stays on the clean scale value — the 1–2px difference is invisible once `items-center` centres it in the 56px bar, and §3 forbids arbitrary heights to force the match.

**Hairline rule** — any "section break" is a single 1px border in `border-ft-line-soft` (paper) or `border-[#221F1A]` (ink). No box-shadows on product surfaces, no double borders.

**Severity dot** — a 6×6 square (not circle): `bg-ft-ember` (high), `bg-ft-ember-soft` (mid), `bg-ft-dim` (low), `bg-ft-ok` (resolved/win).

---

## 12. Settings layout convention

Every settings surface (`/app/customise/<section>` and friends) follows the same shape so a user can move between sections without re-learning the layout each time.

### 12.1 Anatomy of a section

A *section* is a labelled group of related settings, rendered through the single `<SettingsSection>` primitive (`src/app/app/customise/_components/settings-section.tsx`). The primitive owns the editorial header so every section reads identically — never hand-roll the eyebrow + heading stack inline. Top-down order:

1. **Eyebrow line** — `<SettingsSection eyebrow="…">` paints a 1px primary tick + a section-specific eyebrow (e.g. "Surface", "Cursor", "Type") above the heading. Eyebrows are short categorical labels, not the section's own name.
2. **Two-line lockup** — bigger title + optional one-line description on the left; the right slot (`actions`) is reserved for per-section utilities (rare).
3. **Setting rows** — one per option, rendered via `<SettingsRow label="…" control={…} />` from `customise/_components/row.tsx`. Each row has the label on the left and a right-aligned control. **Rows sit on `bg-muted`** — a recessed inset layer one step off the `bg-card` sidebar / content panel they live in (and off the `bg-background` page on mobile, where there's no panel), so the controls read as their own surface instead of blending into the card on a hairline alone. Chips *inside* a row keep `bg-card` so they read as raised controls on the recessed row; their hover routes through `bg-accent` (§2.2), never `bg-muted` (which would merge into the row). `min-h-16` baseline, `max-h-48` (3×) cap. The Card-based rich rows (`<ColorRow>` desktop, `<FontRow>` desktop) carry the same `bg-muted` override so every option surface matches.
4. **Reset** — when the section can be customised away from defaults, a single ghost-button row at the bottom: `Reset to default`. Per-row reset on color/font pickers stays where it lives (inline ⌫ chevron); per-section reset stays at the bottom of the section body.

Each section carries a **togglable** bespoke preview card (§12.5) above its rows — a live, real-component render of *that* section's setting, so the user sees exactly how the choice looks. A `Preview` toggle in the section header collapses it (persisted per section, open by default), so a user who wants a denser list can fold the ones they don't need. (The appearance page is the exception: it replaces per-section cards with a single persistent preview that follows the active section — see §12.5.)

### 12.2 What lives in `control={…}`

Pick the smallest control that fits the choice space:

| Choice space                                                  | Control                                  |
|---------------------------------------------------------------|------------------------------------------|
| 2–6 short discrete values (Style, Thickness, Mode)           | `<ChipGroup>` of chips, right-aligned, wraps to a second row on narrow viewports. Use the `preview` slot whenever the value is *visual* (radius shape, caret style, swatch) — text labels are guesswork for those |
| 7+ values, or values whose names are long                    | `<DropdownMenu>` with the active swatch + label on the trigger button (Theme) |
| Single binary toggle                                         | a chip-group with `[Off] [On]` so the row shape stays uniform |
| Free input (URL, hex, name)                                  | `<Input>` (right-aligned within the row) |
| Continuous numeric                                           | a chip-group of named presets (e.g. Sharp / Soft / Round). Sliders are reserved for sections that genuinely need fine-tuning, never inside a `SettingsRow` |
| Continuous numeric, fine-grained (font size, opacity, margin) | `<SliderRow>` with a percent/value badge — used when presets can't honestly approximate the choice space (the practice-passage Size, Tape margin, Live stats opacity, Max line width). |
| Bounded integer with an "unbounded" escape (lines rendered)  | `<Input type="number">` + an `<Chip label="All">` toggle. `0` is the wire value for unbounded; the input remembers the last numeric pick so toggling All on and off restores it. |

`SettingsCard` (a Card with title + description + body) is **only** for controls that genuinely need their own description and a body too tall for a row — color picker rows (label + desc + swatch picker) and the background image upload zone. New rich-content settings should ask "can this be a SettingsRow?" first.

**Color rows must use `<ColorRow>` (`src/app/app/customise/appearance/_components/color-row.tsx`).** Every colour-picker affordance on the appearance page — theme palette, live stats colour, future surfaces — routes through this single primitive so the swatch + hex + chevron button reads identically. Mobile renders a tight key/value row (label left, swatch right); desktop renders the Card layout above. Don't hand-roll an inline `<ColorPresetPicker>` trigger; reach for `<ColorRow>` instead.

### 12.2a Per-option chip previews

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

**Where they live.** Chip samples are a quick at-a-glance hint *inside* the control; the section's togglable preview card (§12.5) is the decisive full render. The shared samples live in `appearance/_components/chip-previews.tsx` (Surface, Chrome, Live stats, Result, Background) with the more bespoke grids co-located in their row file (`keymap-rows.tsx`, `multiplayer-rows.tsx`, `mistakes-row.tsx`, `tape-row.tsx`, the caret/radius/keyboard previews); behaviour samples live in `behaviour/_components/chip-previews.tsx`. Keep them small (one short line) — the preview card carries the detail. Options where a sample would mislead keep none, per the "don't" list below: temporal values (blink / smooth speed), pure label-is-value picks (font family, palette id, keymap layout name, the WPM/CPM acronym carries a representative number rather than the unit itself), continuous sliders (their value badge is the live readout), and pure pipeline flags with no visual surface (exclude-casual-from-adapt).

### 12.3 Nesting rule

Every option that belongs to the same parent topic lives **inside the same section**. Examples:

- **Caret & cursor** — Style, Thickness, Roundness, Blink, Smooth — *all in one section*.
- **Typography** — Family, Size, Word spacing — *all in one section*.
- **Geometry** — Radius, Borders (and any future spacing scale) — *all in one section*. Borders is a 3-way switch (Default / Soft / Hidden) that flips `<html data-ft-borders="…">`; globals.css force-overrides every hairline in the cascade. Pair with `BordersApplier` mounted from `app/providers.tsx`.

Don't sprinkle related settings across sections; if you find yourself doing that, rename the section or split it cleanly.

### 12.4 Spacing inside a section

The `<SettingsSection>` primitive owns the section spacing — these values are *baked in* and should not be overridden inline. Documented here so future tweaks land in one place.

| What                                         | Class                                                     |
|----------------------------------------------|-----------------------------------------------------------|
| Eyebrow → heading lockup                     | `gap-4` on the header column                              |
| Heading → preview / first row                | `mb-6 sm:mb-7` on the header                               |
| Preview card → first row                     | `mb-6` on the preview card (only when the card is open)   |
| Between rows                                 | `gap-3` on the wrapping body                              |
| Between adjacent sections                    | `border-t border-border/60 pt-10 pb-12 sm:pt-14 sm:pb-16` (bigger pad sm+; first-of-type opts out of the top border) |

### 12.5 Sections are anchors on one page — with a live preview

**Appearance page: one persistent preview, no per-section cards.** `/customise/appearance` does *not* carry per-section preview cards. It runs a single always-on preview (`appearance/_components/preview-pane.tsx`) that follows whichever section is scrolled into view (`useActiveAppearanceSection` — the shared IntersectionObserver in `appearance/_components/use-active-section.ts`) and renders *that* section's real-component preview read-only (most sections share the practice surface; result / keymap / multiplayer render their own faithful composition — all still the real on-page components, never a fork). At `xl` it docks into a sticky right column beside the controls; at `lg` and below it rides the top of the stack. A small primary dot marks every section customised away from its defaults — in the section header (`<SettingsSection changed>`), the desktop sidebar rail, and the mobile section picker — and the pane shows a live "N changed" count. The dot map comes from `useSectionChanges` (`section-changes.ts`), composed over a pure, unit-tested key→section table (`section-fields.ts` + `section-fields.test.ts`); the one-coral-spark rule (§2) holds — the dot is the only accent, no animation. *Rationale: per-section togglable cards fragmented the preview so the user never saw the whole surface change at once; one persistent preview is the clearer answer for a page this dense.*

The togglable per-section card described below remains the pattern for the **behaviour** page and any future customise surface that doesn't warrant a single global preview.

`/app/customise/appearance` is one page. Every topic (Themes & mode, Colors, Geometry, Caret, Typography, Keyboard, Background, Live stats, Typing area, Result, Keymap) renders inline as `<section id="…">` with the catalogued id from `src/app/app/customise/appearance/_sections.ts`. The sidebar links to `/app/customise/appearance#<id>`; the customise scroller jumps to that anchor. There are no sub-page routes — every control lives on the single page so the user is never wondering "is the thing I want behind another click?"

Every section is rendered through `<SettingsSection>` (§12.1), which owns the eyebrow + heading frame and an optional `preview`.

**Bespoke, togglable per-section preview (behaviour page).** Each section's `preview` foregrounds *that section's own* setting — a small, live render built from the **real on-page components** (`<Passage>`, `<Readouts>`/`<MobileReadouts>`, `<Keyboard>`, result-page `<TestSummary>`, …) mounted read-only inside a frozen `<PreviewPracticeProvider>` (`customise/_components/preview-practice.tsx`). Because they're the same components `/app` runs, every override repaints 1:1 with no parallel rendering to drift — including the Colors section, where the readouts + passage paint in the live token values. The previews live in `appearance/_components/section-previews.tsx` (one export per section) and `behaviour/_components/section-previews.tsx`.

A `Preview` toggle in the section header collapses/expands the card; the open/closed state is persisted per section id in localStorage (`ft:customise:preview-open:<id>`), defaulting to **open**. This is what keeps the page from becoming a wall of always-on cards — the user folds the sections they've settled and keeps the ones they're tuning. Do **not** make the previews always-on (no toggle) or mock their contents — reuse the real components, and if a preview needs a setting the real component doesn't honour yet, fix the component, never fork the preview. Static + live, no animation.

Sections whose setting the practice surface can't depict still get a faithful inline composition (the Result preview embeds the real result components; Keymap embeds the real `<Keyboard>`).

**Themes explorer exemption.** `/app/customise/appearance/themes` is a separate full-page browser of every palette — it lives at its own route because it *is* a preview at full size. The Themes section on `/appearance` includes a "Browse all palettes" link to it.

**Sidebar** — the desktop sidebar renders Appearance with its sub-section anchors indented under it on a left rail. The active rail bar tracks whichever section is currently scrolled into view (IntersectionObserver, threshold band 0–1). The mobile picker shows the same shape inside the bottom sheet — picking a row is a hash navigation, not a route change.

### 12.7 Page header

Every customise page opens with `<SettingsPageHeader>` (`_components/page-header.tsx`). The header is **editorial** — drop the placeholder "Section" eyebrow string, name what's actually being customised:

- **Eyebrow** — `Customise · Appearance` / `Customise · Behaviour` (categorical, not the literal word "Section")
- **Title** — descriptive ("Make it look the way you think"), not just the page name. The page name is in the eyebrow and the breadcrumb; the title sells the page.
- **Description** — one sentence under the title naming the scope of what changes here.
- **Right rail** — a customised stat (count + "customised"/"untouched" label), the Reset all button, and a single Manage menu (`<ImportExportMenu>`) that opens a dropdown with Export / Import flinttype / Import MonkeyType. The stat reads as foreground/40 dim when count is 0 and turns primary when there are real overrides; the user knows at a glance how dirty the page is. The Manage menu replaces the previous 3-stacked sidebar-footer panel — settings management lives where the rest of the page-level chrome does, not as a separate rail.

### 12.6 Don't

- **Don't** re-implement the row shell ad-hoc with `<div className="border bg-card …">`. Always use `<SettingsRow>` so future tweaks (radius bump, padding shift) ripple uniformly.
- **Don't** put a description on a row whose label already explains itself; descriptions belong on `SettingsCard`s. The label-on-the-left convention assumes the label is enough.
- **Don't** mix preview-chips and text-chips in the same row. Either every chip in the row carries a `preview`, or none does — visual rhythm matters more than per-chip cleverness.
- **Don't** add per-chip previews on rows whose value is *temporal* (Blink speed, Smooth speed, animation timings). The chip's text label conveys the speed; a static preview can't, and an animated one would be noise.
- **Don't** mix slider + chip presets for the same setting unless the slider is in a separate fine-tune block; the rule of thumb is one control per row.

### 12.8 AI settings assistant

The appearance page opens with `<AiBar>` (`appearance/_components/ai-bar.tsx`): a single-line natural-language input ("warm sepia, big serif, soft corners") that turns a described look into real settings. It posts to `backend.appearance.aiSuggest({ prompt })` (server route `src/server/routes/appearance/`, OpenRouter via `src/server/openrouter.ts`, gated `requireAuth` + a tight rate limit because each call hits a paid model). The model's JSON is **never trusted directly** — `sanitize.ts` whitelists it into an `AppearancePatch` (known theme vars / appearance enums / background fields only; CSS-injection and out-of-range values dropped).

The flow is **preview-first**: when a suggestion returns, the patch is applied straight onto the live prefs stores via `useApplyPatch` (so the whole page + the persistent preview repaint 1:1 — the preview *is* the real state), and a suggestion card reveals (§13) with a one-line summary + a changed-rows list. **Accept** keeps it; **Discard** reverts from the snapshot `useApplyPatch` captured before applying.

Rules:
- The AI only ever writes through the **same typed store setters** the manual controls use (`setVar`, appearance/background `update`) — never a parallel write path.
- The server whitelist is the security boundary. Widen it deliberately (add the key + validator in `sanitize.ts` and the matching line in `prompt.ts`), never by trusting the model.
- No API key configured → the route returns a clear error the bar surfaces; unauthenticated → the bar prompts sign-in. Both are handled states, not crashes.

---

## 13. Animation primitives

Animation in flinttype is the **exception**, not a default. The product is editorial-mechanical (paper-and-ink, hairline borders, JetBrains Mono); ambient motion fights the aesthetic and trips `prefers-reduced-motion`.

`framer-motion` is the only sanctioned animation library, but reach for it sparingly:

- **The AI settings suggestion reveal (§12.8)** is a sanctioned exception: when the appearance assistant returns a proposed look, its suggestion card springs in (`opacity` + `y` + `scale`, ease-out, ~180ms, no bounce) and collapses to a static fade under `prefers-reduced-motion` via `useReducedMotion()`. It earns motion because it's a user-initiated reveal of a result (spatial continuity), mirroring the friends dock.
- A control's effect is genuinely **temporal** and a static sample cannot represent it (the live caret blink in the running practice surface, where blink speed is itself the setting).
- A user-initiated transition (route change, modal entrance) where the motion provides spatial continuity.
- **The friends dock (§17.5)** is a deliberate, user-mandated exception: opening the collapsed pill springs the panel up from the corner with a single transform-based reveal (`opacity` + `y` + `scale`, ease-out, ~180ms, no bounce). It earns motion because it's a user-initiated reveal of a tucked-away surface (spatial continuity). It collapses to a static reveal under `prefers-reduced-motion` via `useReducedMotion()`. The panel reveals as **one** element — the directory rows do **not** stagger (an earlier hub iteration staggered a list; that's retired, don't reintroduce per-row stagger).
- **The race lanes (`<RaceLineupPanel>`, §17 race surface)** are a user-mandated exception: each racer is a **flint-stone SVG** (`/public/stone-assets/*.svg`, a 7-tier fire progression pebble → inferno; the tier escalates with the racer's live WPM via `stoneTierForWpm`) riding a lane toward the finish post. The **glide** along the lane is functional motion (`transition-[left]`, like the progress bars). On top of it the stone carries a subtle idle bob (`@keyframes ft-stone-bob` in globals.css — `translateY` + faint `scale`, ~1.3s), applied **only** via `motion-safe:animate-[…]` so reduced-motion users get a still stone. The local user's stone is the lone coral spark (a coral `drop-shadow` + coral ground line / scorch trail); opponents stay neutral ink (or their `playerColorFor` when the player-colours pref is on). This is the one place a looping idle animation is sanctioned, because it's the race itself — keep it subtle.

### 13.1 Don't

- **Don't** animate per-option chip previews (§12.2a). They're *static + live* — a bare sample of the value, no motion. (Section-level preview cards were removed entirely — see §12.5.)
- **Don't** use motion on a settings row's control (toggle, chip, slider). Native shadcn primitives have their own focus / hover transitions.
- **Don't** loop ambient decorations on any surface. The only sanctioned infinite animations are loaders, the live-spectate pulse dot (§17.4), and the race-stone idle bob (§13, race lanes) — all `motion-safe`-gated.
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
- **Chrome** (`/customise/appearance#chrome`) — `topbarStyle` (elevated / flat / text-only), `footerStyle` (visible / compact / hidden), `modeBarStyle` (chips / inline / hidden), `autoHide` (off / dim / fade) for fading sticky chrome while a run is active. Plus a `Focus mode` reminder: press `F` (outside an input) for a session-temporary stripped view; `Esc` restores.

### 15.2 Implementation contract — data attributes only

Every Surface / Chrome knob lands as a `<html data-ft-…>` attribute, applied by `<AppearanceApplier>` in `src/app/appearance-applier.tsx`. globals.css owns every visual rule. **No component reads these prefs at runtime to alter its markup** (except where genuinely needed: ModeBar swaps render trees, Readouts gates rendering on `none`, Passage on caret idle / quote attribution). The contract:

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
| `(Focus shortcut)` | `data-ft-focus="on"` | (off; attr absent) |

Component self-markers that the CSS rules attach to:

| Marker | Sits on | Purpose |
|---|---|---|
| `[data-ft-topbar]` | TopBar root | Auto-hide target + topbar style override target. |
| `[data-ft-topbar-pill]` | The boxed nav inside TopBar | text-only mode flattens it. |
| `[data-ft-footer]` | AppFooter root | Auto-hide target + footer-style override target. |
| `[data-ft-footer-expand]` | Footer nav link block | Hidden under compact footer style. |
| `[data-ft-chrome]` | Interior chrome (settings sidebar/header, leaderboard sidebar/header) | Auto-hide target. |
| `[data-ft-divider]` / `.ft-divider` | Anything you want the divider rule to honour | Targeted by `data-ft-dividers="hidden|dotted"`. |
| `[data-ft-caret-idle]` | CaretGlyph when `phase==="rest"` and `caretIdle==="pulse"` | Drives the `ft-caret-idle-pulse` keyframe. |

### 15.3 Don't

- **Don't** add a Surface / Chrome knob whose visual effect requires reading the pref inside a React component when a `<html data-ft-…>` attribute + a globals.css rule can deliver the same effect. Data-attr knobs are zero-cost to toggle and don't re-render components.
- **Don't** rename `data-ft-topbar-style` / `data-ft-footer-style` to drop the `-style` suffix. The unsuffixed forms are taken by component self-markers; the suffix is load-bearing.
- **Don't** animate the auto-hide transition beyond the 240ms opacity tween already defined. The user is mid-keystroke; the chrome should disappear quickly enough that they don't notice, not slowly enough to distract.
- **Don't** drop `pointer-events: none` from the `fade` autohide rule. Without it, a stray click on the invisible topbar mid-run can cancel the test.

## 16. Command palette

A globally-mounted Cmd/Ctrl+K palette is the keyboard-first surface for every customisable preference. Mounted once in `src/app/providers.tsx` (`<CommandPalette />`) so it's available on every route. Don't mount it again — the shortcut already binds there.

### 16.1 What it is

- Built on shadcn's `Dialog` + `Command` primitives (`src/components/ui/dialog.tsx`, `src/components/ui/command.tsx`), which wrap `@radix-ui/react-dialog` and `cmdk` respectively. Use those primitives directly when you need a dialog or a searchable list anywhere else; don't fork.
- Two-tier view: the root list shows every entry grouped by category (Mode, Theme, Behaviour, Caret, Keyboard, Appearance, Navigate). Selecting an enum entry swaps the list to a sub-view of its options, where Enter writes the value and returns to root. Escape backs out of a sub-view (and only closes the dialog when already on root).
- Toggles flip on Enter and the dialog stays open (so you can flip several settings in one keystroke session). Actions and links close the dialog. Picking an enum option closes the sub-view.
- **Two openers:** `Cmd/Ctrl+K` (the canonical shortcut — don't rebind it) and **`Esc`**. Escape opens the palette **only when it would otherwise do nothing** — Escape stays primarily a *close/back* key, so the opener bails when any of these is true: the palette is already open (its own capture handler owns Escape — back out of a sub-view, else close); an overlay is open (a Radix dialog/alertdialog/popover/dropdown, the notifications bell, or the friends dock — each detectable in the DOM only while open); focus mode is on (`html[data-ft-focus="on"]` — Escape clears it first, §15); or a text input/textarea/contenteditable is focused (don't steal a blur/clear, and never interrupt typing the passage). When none apply, Escape opens the palette. `F` (focus mode, §15) stays orthogonal. The single global keydown listener for both openers lives in `<CommandPalette>`.
- Focus is pinned to the search input on every open AND on every view switch (root ↔ enum sub-list) via a `requestAnimationFrame` re-focus pass. cmdk's Command primitive doesn't always present a focusable as the first DOM-order child, so Radix's default `onOpenAutoFocus` can land on the dialog shell instead of the input — the explicit ref + rAF focus is more reliable.
- `Tab` and `Shift+Tab` are swallowed (`preventDefault`, no other action) so Radix's focus trap doesn't visibly shift the highlight off the input. The Back button in the enum sub-view is `tabIndex={-1}` for the same reason. The user reaches Back via Esc, not Tab.

### 16.2 Adding an entry

Edit `src/lib/command-palette/use-command-entries.ts`. Every entry is one of four kinds — `action`, `toggle`, `enum`, `link` — described in `src/lib/command-palette/types.ts`. Discipline:

- **One entry per user-facing setting.** Toggles and enums render inline; the user never leaves the palette to flip them.
- **Sliders, colour pickers, and any control that needs a custom widget** ship as `link` entries that deep-link to `/customise/...#<section>` (the customise page's section anchor). The palette closes and the customise page opens at the right surface. Don't try to inline a slider — the keyboard flow degrades and the palette becomes its own form.
- **Keep `hint` short** (one line, ≤ 80 chars). It renders under the label in muted text and is search-indexed alongside the label and `keywords`.
- **Use `keywords`** for tokens a user might type but that don't appear in the label (e.g. `["monkeytype", "minimal"]` on surface entries). cmdk's filter sees them.

### 16.3 Don't

- **Don't** add an entry whose `set` callback opens another modal or navigates somewhere unrelated. The palette is "I know what I want, do it now" — every entry should resolve in zero or one Enter press.
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

### 17.2 People navigation — one switch idiom, shared with the TopBar nav

Segmented switches across the app (the TopBar main nav) are built from **one idiom**, anchored on the TopBar main nav (`top-bar.tsx`), so every switch reads as one family: a `rounded-md border border-border bg-card p-0.5` container, each segment `rounded-sm px-3 py-1.5 text-[13px] tracking-tight` with a subtle `bg-foreground/[0.06] font-semibold text-foreground` active tint (the segment radius is `rounded-sm`, the *concentric* inner radius for a `rounded-md` container with `p-0.5` (2px) inset — never an arbitrary `rounded-[Npx]`, §3) and a `text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground` rest state. Counts ride inline per segment in `tabular-nums text-muted-foreground`. Full-width (segments `flex-1`) on mobile so it never overflows 375px; hugging (`sm:w-fit`, `sm:flex-initial`) from `sm+` like the nav. This is the **one** segmented-switch style — do **not** use the old chunky `bg-muted/40` track (retired across the app). (The friends dock (§17.5) deliberately uses a single search over friends + following rather than a Friends / Following switch — it's a glanceable directory, not a tabbed list.)

### 17.3 Empty-state copy

List empty states use a single dashed-border card (`border-dashed border-border bg-card/40`) with one plain sentence that names the next action ("You're not following anyone yet. Find people on the leaderboard and follow them."). No em dashes, no restated headings.

### 17.4 Live-spectate consent chip (`<SpectatePill>` / `<SpectateIndicator>`)

`src/components/spectate-indicator.tsx`. Broadcasting a live practice run is **ambient** — there is no dedicated broadcast page. Once a user opts in (Customise → Behaviour → Live spectating), any passage-based surface streams via the invisible `<PracticeLiveBroadcast>` mounted inside `PracticeProvider`. The only visible trace is a small chip:

- **`<SpectatePill enabled>`** — presentational. `rounded-md` hairline chip, mono `text-[10px]` uppercase tracked, with a leading status dot + an `Eye` glyph (lucide). The single coral spark is the dot in the **on** state (`bg-primary` with `motion-safe:animate-pulse`); the off state is quiet ink (`text-muted-foreground`, `bg-card`). Pulsing coral dots are reserved for live-spectate state — this consent chip plus the live markers in the friends dock + watch surfaces (§17.5). They convey live state, not decoration (§13), and every one is gated behind `motion-safe:` so reduced-motion users get a static dot. Don't introduce a pulsing dot anywhere else.
- **`<SpectateIndicator>`** — the hooked wrapper mounted on practice/drill surfaces. Renders the pill (linking to the toggle) **only** while signed-in and opted-in, so it never reflows the typing area in the common off case, and doubles as the persistent "your runs are visible" consent reminder.

Don't invent a second "live"/"recording" badge for the broadcaster. A *spectatable friend who is currently broadcasting* is marked separately in the friends dock (§17.5); this chip is strictly the broadcaster's own consent state.

### 17.5 Friends dock — a global, non-intrusive corner affordance (`src/components/friends-dock/`)

There is **no `/friends` page** (it was removed). The friend graph lives in a small, always-available **dock** pinned to the bottom-right corner, mounted once globally from `providers.tsx` (alongside the command palette). It is the one place flinttype runs avatars at full fidelity (an explicit product call, so the rest of the app stays avatar-free). Don't rebuild the old wide hub page; the dock is the friends surface now.

**Collapsed** — a slim `h-11 rounded-md border bg-card` pill: a stack of up to three live/online friend avatars (or a `Users` glyph when idle), a count, and a `Swords` + N badge when race-lobby invites are pending. The label reads `N live` in coral when anyone's broadcasting (the dock's lone spark), else `N online` / `Friends` in muted ink. This is the resting state, quiet and glanceable, never blocking content.

**Expanded** — clicking the pill springs a `w-[min(88vw,360px)]` panel up from the corner (`bg-popover`, hairline border, `max-h-[70dvh]` scroll). Top to bottom: **Live now** (broadcasters — `sm` avatar with the coral pulse dot, handle + tags, live WPM, a quiet "Watch" → `/live/<userId>`); **Challenges** (pending race-lobby invites — a friend opened a lobby and invited you; quiet "Join" → `/race/c/<slug>`); a **search** input; then the **directory** (friends first, then everyone you follow — `<Avatar>` with presence dot, handle + `<UserTag>`s, a presence caption; the whole row links to the profile). Footer: quiet "Find people" link.

- **Challenges are pending invites only.** The dock surfaces only *unread* `race_invite` notifications — a friend opened a private lobby for you. Joining or marking the notification read clears it from the dock. There is no separate duels/results page; a race that's been joined just runs.
- **The directory is glanceable.** Rows link to the profile; the `<FollowButton>` (§17.1) lives there, not in the dock, so the dock stays a read-only "who's around" surface.
- **It steps aside.** Hidden on intentionally immersive surfaces (`/race` — incl. private lobbies at `/race/c/<slug>` — `/live`, `/sign-in`, `/sign-up`) and while a run is active (`data-ft-running`) or focus mode is on (`data-ft-focus`, §15) — the states where the user asked chrome to disappear.
- **Mobile** uses the §10.5 bottom sheet (`<MobileSheet>`), not the floating panel; the collapsed pill stays corner-pinned above the home-indicator inset.
- **Data** comes from `useDockData` (`friends.listFriends` / `listFollowing`, `live.friendsLive`, `presence.list`, and `notifications.list` for pending `race_invite`s), polled only while the dock is mounted and the tab is foregrounded (zero requests on a hidden tab, matching the broadcaster / watch loops, multiplayer.md).

**Activity stays out of the dock.** Friends' personal bests, new follows, and mutual-friendship events live **only** in the notifications bell (`notifications-popover.tsx`, fed by `notifications.list()`). The dock is *who's around and who you can play*, not a timeline.

Don't reintroduce a dedicated `/live` broadcast page — broadcasting is ambient (§17.4) and watching is reached from the dock.

**No directional arrow glyphs in affordance labels.** Don't append `→` / `←` / `‹` / `›` to buttons, links, or row affordances ("Watch", "Accept", "Follow", a nav segment), and don't use them as standalone trailing icons. The hover/active state and the row itself carry the affordance; an arrow is redundant editorial noise here. (This is distinct from genuine inline-content arrows like a chart axis; the rule is about call-to-action chrome.)

### 17.6 Live watch = a fullscreen clone of their screen (`/live/[userId]`)

The watch page is **fullscreen + immersive** — no `<AppChrome>`. It's a `min-h-dvh` surface with a slim sticky header (back to practice · the broadcaster's avatar/handle under a single coral "Spectating" eyebrow · a Fullscreen-API toggle). The cloned screen is **full-bleed** — no frame, no max-width, no card — filling the entire body under the header and laid out exactly like the real practice surface, so it reads as their screen, not a preview tile. The broadcaster, meanwhile, always sees who's watching via the prominent §17.4 spectator-count chip on their own practice screen.


Spectating is **not a bespoke read-only view** — it reproduces the broadcaster's actual practice screen, **every phase**: the real `<ModeBar>` + `<Readouts>` + `<Passage>` while they type, and the real `<TestSummary preview>` on their results screen. `<LiveClone>` (`src/app/live/_components/live-clone.tsx`) mounts those real components (never a fork — a second renderer of the practice surface always drifts out of 1:1 sync) against a frozen `PracticeContext` rebuilt from the live snapshot, the whole surface `pointer-events-none` (it's a view, not controls), wrapped in:

- **`<PrefsOverrideProvider>`** (`src/lib/prefs-override.tsx`) — feeds the broadcaster's appearance / caret / behaviour prefs to the real components. The `useAppearancePrefs` / `useCaretSettings` / `useBehaviourPrefs` hooks consult this context first and return the override read-only (their `update`/`reset` no-op), so the viewer's own stored prefs are never touched. This is the **only** sanctioned way to render practice components with someone else's settings; don't mutate the global prefs store to theme a subtree.
- **The broadcaster's resolved theme CSS vars** on the clone container (`style={screen.themeVars}`) — `--background`, `--primary`, `--ft-passage-*`, `--ft-font-*`, … cascade to the real components so colours + fonts match exactly, scoped to the container (not `<html>`, so it never fights the viewer's own theme).

The broadcaster sends this `screen` payload (phase + windowed `typed` + cursor + mode/length + appearance + caret + behaviour + theme vars, plus the run's `wpmHistory` + `events` on the `done` frame) in `live.progress` **in every phase** while on a practice surface — so "live now" reflects whoever's on their typing screen, and the spectator sees mode changes and results, not just typing. An absent payload falls back to the plain `<LivePassage>` mirror. The watch view replays snapshots through a **~1s jitter buffer** (`useBufferedWatch`) so the mirrored screen advances smoothly instead of stuttering with network jitter. Don't add a "spectator skin" — if the clone looks wrong, the broadcaster's real component is the bug.

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

The dot is `size-1.5 shrink-0 rounded-full`; the caption reuses the existing caption type (`text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground`) with `tabular-nums` on the relative figure. Relative-time copy comes from `relativeTime()` (`src/lib/relative-time.ts`): `just now` / `5m ago` / `2h ago` / `3d ago` / `2w ago`, then an absolute `May 4` past ~a month. The state→label/dot mapping is `presenceCaption()` / `activityWord()` (`src/app/friends/_components/presence-label.ts`); reach for those, don't hand-roll the mapping per surface.

**Activity reporting.** `status` is now genuinely populated. A surface declares the local user's activity by mounting `<ReportActivity status="practicing|racing" />` (`src/app/_components/report-activity.tsx`) inside its `<PracticeProvider>` — the practice/drill surfaces report `practicing`, the race screen reports `racing` (never while spectating). It writes to the `presence-activity` module store (`src/lib/presence-activity.ts`); the global `<PresenceHeartbeat>` reads that store on every beat and fires an immediate beat on change so the switch reaches friends within a second. Don't prop-drill activity into the heartbeat — declare it with `<ReportActivity>`.

## 18. Profile page (`/profile`, `/profile/[username]`)

The profile is the app's **shareable surface** — built to look good to a stranger who's never used flinttype, so it leans visual and identity-forward. Components live in `src/app/profile/_components/`; data is derived client-side from one `history.summary` / `publicProfile` snapshot (`derive-stats.ts`).

### 18.1 Hero layout

`<ProfileHero>` is a single bordered card, not a multi-column flex. The relationship/menu **actions sit in the top-right corner** (`flex items-start justify-between`), *out of the content flow* — never a third flex column, which squeezed the identity + stats. Order inside the card:

1. **Top row** — avatar + name + rank badge + tags + "Follows you" on the left; actions (owner ⋯ menu, or visitor `<FollowButton>` + a `sm:`-only `<InviteToRaceButton>` for friends) hugging the right.
2. **Stats strip** — a full-width `grid-cols-2 sm:grid-cols-4` row (Tests / Time / Best WPM / Streak). Stat values stay ink on a visitor's view so the coral Follow CTA is the page's one spark (§2); the owner's own profile (no follow button) may accent them coral.
3. **Experience bar** — the big full-width level/XP block (`LevelLockup`) that **closes the card** (last element, so nothing sits in dead space beneath it): a prominent level number, a chunky 3px track, and a total-XP / to-next-level breakdown, above a hairline that separates it from the stats. The skill radar does **not** live in the hero (it would leave an awkward gap) — it's paired with Activity in the split card (§18.2).

### 18.2 Activity + Skill split card (`activity-skill-card.tsx`)

A single card **split between Activity and Skill**: the 52-week activity heatmap on the left (~60%) and the skill radar on the right (~40%), divided by a hairline (`md:grid-cols-[1.6fr_1fr]`, stacking with a top border on mobile). The heatmap renders via `<ActivityHeatmap bare>` (no inner card chrome); the radar via the shared `<SkillRadar>` (§18.3). This pairs the two "shape of the player" visuals and avoids two half-empty cards.

### 18.3 Skill radar (`<SkillRadar>`, `src/components/skill-radar.tsx`)

A **four-spoke** radar (**Speed, Accuracy, Consistency, Endurance**) — the shape is the story; there's no value table beside it (redundant; raw numbers live in the stats strip + Personal bests). Profile values are derived by `deriveSkills` (`derive-stats.ts`) — each spoke a 0–100 score: Speed = best WPM vs a **300** ceiling; Endurance = best WPM on any ~30s+ run (keyed off actual elapsed time ≥ ~28s, since `mode` doesn't distinguish time vs words) vs a **250** ceiling; Accuracy rescaled into the 80–100 band; Consistency = 100 − WPM CV.

- **Always overlay the average baseline.** A radar with no reference reads as arbitrary, so `<SkillRadar baseline={…}>` draws a second muted **dashed** series (the average-typist scores) behind the user's coral shape, with a tiny "You / Average" legend. The baseline lives in `src/lib/skill-baseline.ts` — a committed default, **regenerated from real data by `yarn skills:baseline`** (computes each user's axes with the same `deriveSkills`, averages them, rewrites the file). Run it periodically + commit.
- **`<SkillRadar>` is a shared component** (`src/components/`) because two surfaces use it: the profile Activity+Skill split card (real `deriveSkills` data) and the `/updates` showcase card (a sample shape). `compact` tightens it for small slots. Don't fork it. It reuses the shared `ChartContainer` from `@/components/ui/line-chart` (same wrapper `wpm-trend` uses) — do **not** add a second chart wrapper. Coral (`var(--primary)`) stroke + ~0.18 fill over a hairline polar grid, **no glow filter** (the "glowing radar" demo is off-brand: §13 bans ambient glow).
- The chart is **`pointer-events-none` + `[&_*]:outline-none`** so a stray click never draws a focus box around it, and **`outerRadius` is held back (~66–70%)** with margins so the axis labels never clip. It's a static visual, not an interactive control.

### 18.4 Rank badge (`<RankBadge>`, `rank-badge.tsx`)

A **self-selected** WPM-tier flair (Ember…Solar Flare, `src/types/rank.ts`) shown beside the name. Distinct from §14 identity marks: those are *eligibility-gated* (server-resolved grants); a rank is *free choice*, a cosmetic the user picks in Edit profile regardless of actual speed (the picker only *suggests* a tier from their best WPM). One fixed ember tint across all 11 tiers — a `Flame` glyph in coral + the label in ink, in a hairline chip; no tier is louder than another. Stored as a `{ id }` object slice under the `profileRank` pref (object-slice so the object-only `useRemotePrefs` hook binds it); read into the profile snapshot server-side via `readProfileRank` so visitors see it too.

### 18.5 Don't

- **Don't** reinstate a "head-to-head" comparison panel. Comparison was removed in favour of each profile's own skill radar; a sparse two-column stat table read as empty. If cross-user comparison returns, overlay a second series on the radar, don't build a stat grid.
- **Don't** make the actions a flex column beside identity/stats (the original bug). Top-right corner only.
- **Don't** paint the rank badge per-tier colours or animate it — it's identity, not a notification.

## 19. Update cards (`/updates/[slug]`)

A major release worth showing off gets an **update card** — a **light, wide, visual advert** at the private route `/updates/<slug>`, built to **screenshot and paste into Discord** (which renders wide images large), not to read like a changelog. **Landscape, condensed, visual:** a headline + a single row of preview thumbnails, **no per-feature prose**. The changelog (`public/CHANGELOG.md`) stays the exhaustive per-version log; the update card is the *promo asset*.

- **Registry-driven.** Content lives in `src/lib/updates.ts` (`UPDATES`): `{ slug, version, title, tagline, date, versions[], highlights[] }`, where each highlight is `{ preview: string, label: string }` — `preview` keys into `UPDATE_PREVIEWS`, `label` is a one-word caption. Add an entry; the route + changelog link derive from it. No per-card bespoke page.
- **Bespoke previews, not icons.** Each highlight renders a small **mini-mockup** of the feature (hub / challenges / spectate / profile) from `UPDATE_PREVIEWS` (`src/app/updates/_components/previews.tsx`) — little framed UI snapshots (a people list, a race-invite row, a live passage, a profile card) built **entirely from the fixed `ft-*` light tokens** so they stay light inside the forced-light card. They're `aria-hidden` decoration with a one-word label beneath; the mockups carry the message. A generic lucide-icon tile is **not** good enough — the previews sell the feature.
- **The card** (`src/app/updates/[slug]/page.tsx`) is a **forced-light, landscape** asset (`max-w-4xl`) — fixed `ft-*` paper-and-ink tokens (§2.3) so it renders the same in dark mode and screenshots as a clean light promo. **No `<AppChrome>`** — the page *is* the card, centred on a `bg-ft-paper-soft` field with a small "Back to changelog" link beneath. Shape: brand `<Logo>` + ember version·date pill, a big `text-3xl/5xl` headline + one-line tagline, then a **single wide row of preview thumbnails** (`sm:grid-cols-4`, 2×2 on mobile) each with its one-word label, then a brand footer strip. Keep it wider than tall so a pasted screenshot reads. Stay within the hairline/no-glow brand (no drop shadows).
- **Private (`noIndex: true`)** via `buildPageMetadata`, so it's omitted from sitemap + `llms.txt` (SEO S8). Unknown slug → `notFound()`.
- **Changelog linkage:** the `/changelog` page calls `updateForVersion(entry.version)` and renders a "Read the update" link on covered entries. List the headline versions in the update's `versions[]`.
- **Don't** make the card technical, theme-aware, or chrome-wrapped — it's a fixed-light advert. Don't hand-roll a second update page outside the registry, and don't index these pages.

## 20. Amending this document

When you introduce a new pattern:

1. Open this file.
2. Add a row to the matching table (§2 color, §3 spacing, §4 typography, §5 layout, §12 settings, §13 animation, §14 identity marks, §15 minimisation knobs, §16 command palette, §17 social controls, §18 profile, §19 update cards) **or** a new section with the next sequential number.
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
