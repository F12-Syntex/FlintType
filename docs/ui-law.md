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
| `bg-accent`, `text-accent-foreground`              | `--accent`, `--accent-foreground`        | Hover / highlight tint.                                        |
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

Ships with six community palettes sourced from [tweakcn.com](https://tweakcn.com): Claude, Supabase, T3 Chat, Mocha Mousse, Caffeine, Amethyst Haze. Registered in `src/lib/themes.ts` → `THEMES`.

### 9.1 What swaps, what doesn't
- Theme-aware semantic classes (§2, layer 1) swap automatically.
- Fixed zinc literals (§2, layer 2 — the table) do not swap by design — they stay neutral under every theme.

### 9.2 Adding a theme
1. Fetch `https://tweakcn.com/r/themes/<slug>.json`.
2. Copy `cssVars.light` into `html.theme-<slug> { ... }` and `cssVars.dark` into `html.dark.theme-<slug> { ... }` in `src/app/themes.css`. Keep the `html` prefix — it wins the specificity tie against `:root`.
3. Register the id + label in `src/lib/themes.ts` `THEMES`.
4. All three changes land in one commit — same commit that introduces any UI using the new theme.

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

### 10.4 Amending §§3 and 5 for mobile-first
When you add a new row to the spacing or layout tables:
- If the value might ever differ between mobile and desktop, write the pair inline: `py-10 sm:py-20`. Don't ship a single-value row "for now" and plan to revisit — future-you will forget.
- If the value is genuinely viewport-independent (icon size, input border), a single value is fine.

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

The shadcn `<Button>` is still preferred when the form/dialog already uses shadcn primitives — but flinttype-themed CTAs (the editorial buttons in screen designs) use `<FtButton>`.

**Brand mark.** Always render via `<Logo>`. The flame SVG at `/public/flinttype-logo.svg` is the single source of truth — never hand-roll a square/diamond mark inline. An older rotated-square glyph appeared in early commits; it has been replaced everywhere.

**Hairline rule** — any "section break" is a single 1px border in `border-ft-line-soft` (paper) or `border-[#221F1A]` (ink). No box-shadows on product surfaces, no double borders.

**Severity dot** — a 6×6 square (not circle): `bg-ft-ember` (high), `bg-ft-ember-soft` (mid), `bg-ft-dim` (low), `bg-ft-ok` (resolved/win).

---

## 12. Settings layout convention

Every settings surface (`/app/customise/<section>` and friends) follows the same shape so a user can move between sections without re-learning the layout each time.

### 12.1 Anatomy of a section

A *section* is a labelled group of related settings. Top-down order:

1. **Section header** — `<SectionHeader label="…">` from `src/app/app/customise/_components/...`. Uppercase eyebrow with a primary accent bar. One per section.
2. **Hero preview (optional)** — a single bordered card on `bg-card` showing what the section's settings produce *live*. Use whenever a setting's effect is visual (Caret, Typography, Geometry/Radius, Background, Themes-not-yet). Use the user's current values; animate or cycle when that helps the user understand.
3. **Setting rows** — one per option. Use `<SettingsRow label="…" control={…} />` from `customise/_components/row.tsx`. Each row has the label on the left and a right-aligned control. `min-h-16` baseline, `max-h-48` (3×) cap.
4. **Reset** — when the section can be customised away from defaults, a single ghost-button row at the bottom: `Reset to default`.

### 12.2 What lives in `control={…}`

Pick the smallest control that fits the choice space:

| Choice space                                                  | Control                                  |
|---------------------------------------------------------------|------------------------------------------|
| 2–6 short discrete values (Style, Thickness, Mode)           | `<ChipGroup>` of chips, right-aligned, wraps to a second row on narrow viewports. Use the `preview` slot whenever the value is *visual* (radius shape, caret style, swatch) — text labels are guesswork for those |
| 7+ values, or values whose names are long                    | `<DropdownMenu>` with the active swatch + label on the trigger button (Theme) |
| Single binary toggle                                         | a chip-group with `[Off] [On]` so the row shape stays uniform |
| Free input (URL, hex, name)                                  | `<Input>` (right-aligned within the row) |
| Continuous numeric                                           | a chip-group of named presets (e.g. Sharp / Soft / Round). Sliders are reserved for sections that genuinely need fine-tuning, never inside a `SettingsRow` |

`SettingsCard` (a Card with title + description + body) is **only** for controls that genuinely need their own description and a body too tall for a row — color picker rows (label + desc + swatch picker) and the background image upload zone. New rich-content settings should ask "can this be a SettingsRow?" first.

### 12.3 Nesting rule

Every option that belongs to the same parent topic lives **inside the same section**. Examples:

- **Caret & cursor** — Style, Thickness, Roundness, Blink, Smooth — *all in one section*.
- **Typography** — Family, Size, Word spacing — *all in one section*.
- **Geometry** — Radius (and any future spacing scale) — *all in one section*.

Don't sprinkle related settings across sections; if you find yourself doing that, rename the section or split it cleanly.

### 12.4 Spacing inside a section

| What                                         | Class                            |
|----------------------------------------------|----------------------------------|
| Space between section header and first row   | `mb-3` on the header             |
| Space between rows / hero / reset            | `gap-3` on the wrapping `<div>`  |
| Space between adjacent sections              | `mb-8` on the wrapping `<div>`   |

### 12.5 Don't

- **Don't** re-implement the row shell ad-hoc with `<div className="border bg-card …">`. Always use `<SettingsRow>` so future tweaks (radius bump, padding shift) ripple uniformly.
- **Don't** put a description on a row whose label already explains itself; descriptions belong on `SettingsCard`s. The label-on-the-left convention assumes the label is enough.
- **Don't** mix preview-chips and text-chips in the same row. Either every chip in the row carries a `preview`, or none does — visual rhythm matters more than per-chip cleverness.
- **Don't** add per-chip previews on rows whose value is *temporal* (Blink speed, Smooth speed, animation timings). The chip's text label conveys the speed; a static preview can't, and an animated one would be noise.
- **Don't** mix slider + chip presets for the same setting unless the slider is in a separate fine-tune block; the rule of thumb is one control per row.

---

## 13. Amending this document

When you introduce a new pattern:

1. Open this file.
2. Add a row to the matching table (§2 color, §3 spacing, §4 typography, §5 layout, §12 settings) **or** a new section with the next sequential number.
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
