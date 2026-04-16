# shadcn-nextjs-boilerplate

Next.js + shadcn boilerplate with a **hierarchical, Zod-validated backend** and a **typed `useBackend()` client** that mirrors the server tree.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4** + **shadcn/ui** (`base-nova` style, neutral base)
- **TypeScript 5** (strict)
- **Zod 4** for server-side input validation
- **Vitest 4** for unit tests
- **Yarn** (classic) as the package manager

## Getting started

```bash
yarn install
yarn dev          # http://localhost:3000
yarn test         # 22 unit tests
yarn test:watch   # vitest in watch mode
yarn build        # production build
yarn lint
```

## Backend architecture

A single catch-all dispatcher walks the route tree, collecting middleware at every level and running the onion:

```
POST /api/users/admins/list
 └─ logging (global, from router)
     └─ requireAuth (users namespace)
         └─ requireAdmin (users/admins namespace)
             └─ validate(input) via Zod   // no-op here since list takes no input
                 └─ handler(ctx)
```

### Directory layout

```
src/
├── app/
│   ├── api/[...path]/route.ts     # dispatcher: resolves path, runs pipeline
│   └── page.tsx                   # demo UI
├── server/
│   ├── index.ts                   # barrel: defineRoute, defineNamespace, ...
│   ├── types.ts                   # RouteDef, NamespaceDef, Middleware
│   ├── errors.ts                  # BackendError, ErrorCode union
│   ├── defineRoute.ts
│   ├── defineNamespace.ts
│   ├── resolve.ts                 # walks tree, collects middleware
│   ├── pipeline.ts                # runs middleware + validate + handler
│   ├── router.ts                  # root namespace (global middleware)
│   ├── testing.ts                 # callRoute() test helper
│   ├── db.ts                      # demo in-memory data
│   ├── middleware/
│   │   ├── logging.ts
│   │   └── auth.ts                # requireAuth, requireAdmin
│   └── routes/
│       ├── health/index.ts        # no middleware
│       ├── echo/index.ts          # zod-validated input
│       └── users/
│           ├── index.ts           # requireAuth
│           └── admins/
│               └── index.ts       # requireAuth + requireAdmin
├── lib/
│   ├── backend.ts                 # useBackend() — recursive Proxy
│   └── safe.ts                    # optional Result-style wrapper
└── types/
    └── user.ts                    # shared domain type
```

## Authoring routes

### 1. Create the namespace

```ts
// src/server/routes/widgets/index.ts
import { z } from 'zod';
import { defineNamespace, defineRoute, BackendError } from '@/server';

const getInputSchema = z.object({ id: z.string() });
export type GetWidgetInput = z.infer<typeof getInputSchema>;
export type Widget = { id: string; label: string };

export const widgets = defineNamespace({
  routes: {
    get: defineRoute<GetWidgetInput, Widget>({
      input: getInputSchema,
      handler: ({ input }) => {
        if (input.id === 'missing') {
          throw new BackendError(404, 'NOT_FOUND', `widget ${input.id} not found`);
        }
        return { id: input.id, label: `widget-${input.id}` };
      },
    }),
  },
});
```

**Types are always exported and named** — `GetWidgetInput`, `Widget`. Tests and fixtures import them.

### 2. Register in `router.ts`

```ts
import { widgets } from './routes/widgets';
export const router = defineNamespace({
  middleware: [logging],
  routes: { health, echo, users, widgets },
});
```

### 3. Unit test

```ts
// src/server/routes/widgets/index.test.ts
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { BackendError } from '@/server/errors';
import { callRoute } from '@/server/testing';
import type { Widget } from './index';

describe('widgets.get', () => {
  it('returns the widget', async () => {
    const w = await callRoute<Widget>(['widgets', 'get'], { input: { id: '1' } });
    expect(w.label).toBe('widget-1');
  });
  it('404 for unknown ids', async () => {
    await expect(
      callRoute(['widgets', 'get'], { input: { id: 'missing' } }),
    ).rejects.toSatisfy(
      (e: unknown) => e instanceof BackendError && e.code === 'NOT_FOUND',
    );
  });
  it('rejects bad input via Zod', async () => {
    await expect(
      callRoute(['widgets', 'get'], { input: {} }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
```

### 4. Call from the client

```tsx
'use client';
import { useBackend, BackendError } from '@/lib/backend';

function WidgetCard({ id }: { id: string }) {
  const backend = useBackend();
  // typed: (input: GetWidgetInput) => Promise<Widget>
  const load = () => backend.widgets.get({ id });
  // ...
}
```

The client types come from `typeof router` — no codegen, no import of server code. Renaming a server route breaks the client at compile time.

## Middleware

- **Global** — attach to the root router: `defineNamespace({ middleware: [logging, ...], routes: {...} })`.
- **Per-namespace** — attach at any folder's `defineNamespace`. Cascades to all descendants.
- **Per-route** — pass `middleware: [...]` to `defineRoute`. Innermost.

Middleware signature is Koa/Express style:

```ts
export const requireAuth: Middleware = async (ctx, next) => {
  const userId = ctx.req.headers.get('x-user-id');
  if (!userId) throw new BackendError(401, 'UNAUTHORIZED', 'missing x-user-id');
  ctx.meta.userId = userId;
  return next();
};
```

`ctx.meta` is a shared bag — downstream middleware/handlers read it for auth context, trace IDs, etc.

## Errors

Throw `BackendError(status, code, message, details?)` anywhere in the pipeline. `code` is a typed union — add new codes to `src/server/errors.ts`.

```ts
export type ErrorCode =
  | 'VALIDATION' | 'UNAUTHORIZED' | 'FORBIDDEN'
  | 'NOT_FOUND'  | 'CONFLICT'     | 'INTERNAL';
```

The dispatcher serializes `BackendError` as JSON; the client reconstructs it and re-throws. `ZodError` is converted into `VALIDATION` with `details.issues`.

Callers can handle errors two ways:

```ts
// throws (idiomatic)
try {
  const w = await backend.widgets.get({ id });
} catch (err) {
  if (err instanceof BackendError && err.code === 'NOT_FOUND') { /* typed */ }
}

// or explicit result — opt-in
import { safe } from '@/lib/safe';
const r = await safe(backend.widgets.get({ id }));
if (!r.ok) return r.error.code;
r.data.label;
```

## MCP servers

`.mcp.json` wires three project-scoped MCP servers for Claude Code:

| Server      | Purpose                                                         |
|-------------|-----------------------------------------------------------------|
| `shadcn`    | Component installs and registry queries                         |
| `magic`     | 21st.dev component generation (needs `TWENTYFIRST_API_KEY`)     |
| `context7`  | Authoritative docs for Next.js, Tailwind, shadcn, React, etc.   |

Restart Claude Code after cloning to pick up the servers.

## Commit protocol

- Conventional Commits: `type(scope): title`.
- First line of the body is the version from `VERSION`.
- `VERSION` bumps on every commit: patch default, minor for features, major for breaking.
- No AI/Claude attribution in commit messages.

See `CLAUDE.md` for the full protocol.
