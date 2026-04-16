# UI Law

The authoritative design document for this project. Every UI change must conform to the rules below.

This file is intentionally a **blank slate**. Visual conventions (palette, spacing, typography, layouts) are decided per application — fill the sections below as you build. The structural rules (component reuse, async feedback, accessibility, backend integration, **mobile-first**, amending procedure) stay fixed because they belong to the boilerplate.

**Mobile-first is not blank.** Section 10 mandates that every UI be designed for a 375 px viewport first and scaled up from there. Applications override palette, spacing scale, typography, and layout choices; they do **not** override the mobile-first direction.

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

Two layers, used for different jobs:

1. **Theme-aware semantic classes** — `bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `border-input`, `ring`, `bg-destructive`, etc. These are wired to CSS variables in `src/app/globals.css` and `src/app/themes.css`, so they swap when the user picks a theme via `<ThemeSwitcher>` (see §9). Prefer these for any surface that should follow the active theme — every shadcn primitive (`Button`, `Input`, Card, Dialog, …) already uses them.
2. **Fixed zinc literals** — the table below. Use these only when a surface must stay zinc regardless of theme — e.g. code-block surfaces in §4, the sticky header backdrop, or a demo row that intentionally reads as neutral.

Neutral palette for literals: **`zinc`**. Semantic: **`red`** for errors. No other palettes (no slate, gray, neutral, stone). No arbitrary hex.

| Purpose                  | Light                       | Dark                          |
|--------------------------|-----------------------------|-------------------------------|
| Page background          | `bg-zinc-50`                | `dark:bg-black`               |
| Card / surface           | `bg-white`                  | `dark:bg-zinc-950`            |
| Subtle / code-block surface | `bg-zinc-100`            | `dark:bg-zinc-900`            |
| Inline-code surface      | `bg-zinc-200`               | `dark:bg-zinc-800`            |
| Card border              | `border-zinc-200`           | `dark:border-zinc-800`        |
| Input border             | `border-zinc-300`           | `dark:border-zinc-700`        |
| Text primary             | `text-zinc-950`             | `dark:text-zinc-50`           |
| Text secondary           | `text-zinc-600`             | `dark:text-zinc-400`          |
| Text muted               | `text-zinc-500`             | *(no dark override — stays)*  |
| Error text               | `text-red-600`              | `dark:text-red-400`           |

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

---

## 4. Typography

Font family: inherits (`font-sans`). Weights used: `400` (default), `500` (medium), `600` (semibold).

| Role             | Class                                                                 |
|------------------|-----------------------------------------------------------------------|
| Eyebrow          | `text-xs font-medium uppercase tracking-widest text-zinc-500`         |
| H1 (page title)  | `text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50` |
| Body             | `text-base leading-7 text-zinc-600 dark:text-zinc-400`                |
| Small / caption  | `text-xs text-zinc-500`                                               |
| Inline code      | `rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800`            |
| Code block       | `overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900`    |
| Error text       | `text-sm text-red-600 dark:text-red-400`                              |

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

## 11. Amending this document

When you introduce a new pattern:

1. Open this file.
2. Add a row to the matching table (§2 color, §3 spacing, §4 typography, §5 layout) **or** a new section with the next sequential number.
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
