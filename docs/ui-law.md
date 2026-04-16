# UI Law

The authoritative design document for this project. Every UI change must conform to the rules below.

## The Meta-Rule

> **Any new pattern not already in this document must be added here *first*, then adopted in code — in the same commit.**
>
> - If the convention exists below: use it exactly as specified.
> - If it doesn't: open this file, add the rule with a one-line rationale, and ship it alongside the code that uses it.
> - Retroactive documentation is how inconsistency creeps in. The document leads; the code follows.

If you reach for a color, spacing value, typography class, or layout pattern that isn't in this document, **stop and amend the document**.

## 1. Component reuse

### 1.1 shadcn primitives are the only buttons, inputs, dialogs, selects, etc.
- `Button` → `@/components/ui/button`. Never style a raw `<button>` inline.
- For any shadcn-available primitive (Input, Dialog, Sheet, Select, Tabs, …), install it via the `shadcn` MCP or `yarn shadcn add <name>` and use it. Never hand-roll.
- If shadcn doesn't cover it, build **once** under `src/components/<name>.tsx` and reuse. Don't re-create variants scattered across routes.

### 1.2 Where components live
- Route-scoped composites (only used by one page): `src/app/<route>/_components/<name>.tsx`.
- Cross-route reusables: `src/components/<name>.tsx`.
- shadcn-generated primitives: `src/components/ui/<name>.tsx` (don't hand-edit unless noted).

## 2. Tailwind conventions

### 2.1 Colors

**Neutral palette: `zinc` only.** Matches shadcn `base-nova` / neutral base. Never `slate`, `gray`, `neutral`, or `stone`.

| Purpose               | Class                                          |
|-----------------------|------------------------------------------------|
| Page background       | `bg-zinc-50 dark:bg-black`                     |
| Card / surface        | `bg-white dark:bg-zinc-950`                    |
| Subtle / code surface | `bg-zinc-100 dark:bg-zinc-900`                 |
| Inline code surface   | `bg-zinc-200 dark:bg-zinc-800`                 |
| Card border           | `border-zinc-200 dark:border-zinc-800`         |
| Input border          | `border-zinc-300 dark:border-zinc-700`         |
| Text primary          | `text-zinc-950 dark:text-zinc-50`              |
| Text secondary        | `text-zinc-600 dark:text-zinc-400`             |
| Text muted            | `text-zinc-500`                                |

**Semantic colors** (only add more when a UI state demands it):

| State   | Class                              |
|---------|------------------------------------|
| Error   | `text-red-600 dark:text-red-400`   |

**Never:** arbitrary hex (`bg-[#abc]`), foreign palettes, unlabelled semantic colors. If a new state (success, warning, info) is needed, add the row first.

### 2.2 Spacing scale

Tailwind's default numeric scale only. Allowed step values: `1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20`.

| Context                          | Class                        |
|----------------------------------|------------------------------|
| Tight stack (form rows)          | `gap-2` / `gap-3`            |
| Card contents                    | `gap-3`                      |
| Between sections                 | `gap-6` / `gap-8` / `gap-10` |
| Card padding                     | `p-5`                        |
| Page horizontal padding          | `px-8`                       |
| Page vertical padding            | `py-20`                      |
| Code block padding               | `p-3`                        |
| Inline code padding              | `px-1 py-0.5`                |
| Inline input padding             | `px-3 py-2`                  |

**Never:** arbitrary pixel values (`p-[13px]`). If a new size is needed, add a row above with rationale.

### 2.3 Typography

| Role           | Class                                                             |
|----------------|-------------------------------------------------------------------|
| Eyebrow        | `text-xs font-medium uppercase tracking-widest text-zinc-500`     |
| H1             | `text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50` |
| Body           | `text-base leading-7 text-zinc-600 dark:text-zinc-400`            |
| Small body     | `text-sm text-zinc-600 dark:text-zinc-400`                        |
| Inline code    | `rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800`        |
| Code block     | `overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900`|

Font family: inherits (`font-sans`). Weights used: `400`, `500`, `600`. Nothing else (no `700`, no `300`, no italics unless a new row is added).

### 2.4 Layout recipes

- **Page shell**: `min-h-screen bg-zinc-50 font-sans dark:bg-black`
- **Centered column**: `mx-auto flex max-w-3xl flex-col gap-10 px-8 py-20`
- **Card**: `flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950`
- **Inline input**: `flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700`
- **Button row**: `flex items-center gap-3`

### 2.5 Dark mode
Every color class ships with its `dark:` pair. No exceptions. If you write `bg-white`, you write `dark:bg-zinc-950` next to it.

### 2.6 Responsive
Mobile-first. Default classes target small screens; use Tailwind breakpoints (`sm`, `md`, `lg`, `xl`) to upgrade. No custom breakpoints.

## 3. Component structure

### 3.1 Server Components by default
`'use client'` only when a component uses state, effects, refs, browser APIs, or `useBackend()`.

### 3.2 Props
- Explicitly typed (no `props: any`, no unannotated destructure).
- Structural props come from `src/types/` when they match a domain concept; otherwise define in-file with a named type.

### 3.3 Async action feedback
Every async action surfaces three states somewhere visible:
- **Loading** — disable the trigger; label changes (e.g. `Save` → `Saving…`).
- **Success** — reset the form or show a confirmation.
- **Error** — render with `text-red-600 dark:text-red-400`, preferably including `BackendError.code` so the user sees *why*.

## 4. Accessibility baseline

- Every `<input>` has an associated `<label>` or `aria-label`.
- Icon-only buttons have `aria-label`.
- Don't override the keyboard behavior shadcn primitives ship with.
- Never rely on color alone to convey state — pair with icon or text.

## 5. Backend integration

Every component that calls the backend uses `useBackend()`. See `docs/backend-rules.md` → "Calling from the client" for the mechanics (Proxy, headers, throw vs `safe()`).

### 5.1 The canonical fetch-and-render template

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BackendError, useBackend } from '@/lib/backend';
import type { User } from '@/types/user';          // types come from src/types/

export function UsersList() {
  const backend = useBackend();
  const [data, setData] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setData(await backend.users.list());         // typed as User[]
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
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">users</span>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {data?.map((u) => (
        <div key={u.id} className="text-sm text-zinc-600 dark:text-zinc-400">
          {u.name} <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">{u.role}</code>
        </div>
      ))}
    </section>
  );
}
```

What to notice:
- `'use client'` because we use `useState` + `useEffect` + `useBackend` (§3.1).
- Types imported from `@/types/*` only — never from `@/server/*` (backend R9).
- Three-state feedback surfaced visibly (§3.3): loading disables the button and changes its label, error renders in red, success renders the list.
- Only classes from §2 — card recipe, eyebrow, body, inline code — no new inventions.

### 5.2 Typed error branching (preferred over string matching)

```tsx
catch (err) {
  if (err instanceof BackendError) {
    switch (err.code) {
      case 'UNAUTHORIZED': signIn(); return;
      case 'FORBIDDEN':    setError("You don't have access."); return;
      case 'NOT_FOUND':    setError('Gone.'); return;
      case 'VALIDATION':   setError(err.message); return;        // field-level in err.details.issues
      default:             setError(err.message);
    }
  } else {
    throw err;   // let the error boundary handle it
  }
}
```

### 5.3 When throw feels noisy — use `safe()`

```tsx
import { safe } from '@/lib/safe';

const r = await safe(backend.users.get({ id }));
if (!r.ok) {
  if (r.error.code === 'NOT_FOUND') return <p className="text-sm text-red-600 dark:text-red-400">Not found.</p>;
  return <p className="text-sm text-red-600 dark:text-red-400">{r.error.message}</p>;
}
return <p className="text-sm text-zinc-600 dark:text-zinc-400">{r.data.name}</p>;
```

Pick one style per call site — don't mix.

### 5.4 Auth headers happen once, outside components

Never call `setBackendHeaders` inside render. Do it at app init, after login, or in a provider mount:

```tsx
useEffect(() => {
  setBackendHeaders(() => ({ 'x-user-id': session.userId }));
}, [session.userId]);
```

## 6. Amending this document

When you need to introduce a new pattern:

1. Open this file.
2. Add the rule in the right section (or create a new section with the next sequential number).
3. Include a one-line rationale — why this pattern, what problem it solves.
4. Commit the doc change **in the same commit** as the code using it.
5. From that commit forward, all UI must follow the new rule.

## LLM checklist before submitting a UI change

- [ ] Did you use only colors from §2.1?
- [ ] Did you use only spacing values from §2.2?
- [ ] Did every color class have its `dark:` pair?
- [ ] Did you reuse shadcn / existing components instead of building new ones?
- [ ] Does every async action surface loading + success + error?
- [ ] Are labels and focus states preserved?
- [ ] If you introduced a new pattern, did you add it to this document in the **same commit**?
