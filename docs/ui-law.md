# UI Law

The authoritative design document for this project. Every UI change must conform to the rules below.

This file is intentionally a **blank slate**. Visual conventions (palette, spacing, typography, layouts) are decided per application — fill the sections below as you build. The structural rules (component reuse, async feedback, accessibility, backend integration, amending procedure) stay fixed because they belong to the boilerplate.

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

---

## 2. Colors

_Empty — fill as you adopt. Every row names a semantic role and the Tailwind classes for light and dark. No arbitrary hex, no foreign palettes once a palette is chosen._

| Purpose | Light | Dark |
|---------|-------|------|
| *(add rows as you adopt them)* |  |  |

---

## 3. Spacing

_Empty — fill as you adopt. Record every spacing step you use (and where) so values don't proliferate. No arbitrary pixel values (`p-[13px]`)._

| Context | Class |
|---------|-------|
| *(add rows as you adopt them)* |  |

---

## 4. Typography

_Empty — fill as you adopt. Name each text role (eyebrow, h1, body, caption, inline-code, code-block, error, …) and the class string that produces it. Rely on a small set of font weights and sizes._

| Role | Class |
|------|-------|
| *(add rows as you adopt them)* |  |

---

## 5. Layout recipes

_Empty — fill as you adopt. Each reusable layout (page shell, centered column, card, row, grid, …) is a named recipe with its class string. When the same structure shows up twice, name it here._

| Recipe | Class |
|--------|-------|
| *(add rows as you adopt them)* |  |

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

### 8.4 Auth headers once, outside render

```tsx
useEffect(() => {
  setBackendHeaders(() => ({ 'x-user-id': session.userId }));
}, [session.userId]);
```

Never call `setBackendHeaders` inside render.

---

## 9. Amending this document

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
- [ ] Every async action surfaces loading + success + error (§6.3)?
- [ ] Labels and focus states preserved (§7)?
- [ ] Backend calls go through `useBackend()` / `safe()`, types imported from `src/types/` (§8)?
