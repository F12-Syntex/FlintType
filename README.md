# shadcn-nextjs-boilerplate

Minimal Next.js + shadcn boilerplate with a typed backend layer and unit tests baked in.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4** + **shadcn/ui** (`base-nova` style, neutral base)
- **TypeScript 5** (strict)
- **Vitest 4** for unit tests
- **Yarn** (classic) as the package manager

## Getting started

```bash
yarn install
yarn dev          # http://localhost:3000
yarn test         # run the suite
yarn test:watch   # vitest in watch mode
yarn build        # production build
yarn lint
```

## Backend architecture

Routes are defined as typed objects in `src/server/routes/**` and combined in `src/server/router.ts`. A single catch-all handler at `src/app/api/[namespace]/[method]/route.ts` dispatches requests through a middleware pipeline.

```
src/
├── app/
│   ├── api/[namespace]/[method]/route.ts   # dispatcher
│   └── page.tsx                            # demo UI
├── server/
│   ├── types.ts         # RouteDef, Middleware, RouteContext
│   ├── errors.ts        # BackendError (status-aware)
│   ├── defineRoute.ts   # helper that preserves I/O generics
│   ├── middleware.ts    # shared middleware (logging, …)
│   ├── pipeline.ts      # runs validate + middleware + handler
│   ├── router.ts        # combines namespaces + global middleware
│   └── routes/
│       ├── health.ts    # health.ping
│       ├── health.test.ts
│       ├── echo.ts      # echo.say
│       └── echo.test.ts
└── lib/
    └── backend.ts       # useBackend() — typed client
```

### Adding a route

1. Create `src/server/routes/widgets.ts`:

   ```ts
   import { defineRoute } from '../defineRoute';
   import { BackendError } from '../errors';

   export const widgets = {
     get: defineRoute<{ id: string }, { id: string; label: string }>({
       validate: (v) => {
         if (!v || typeof (v as { id?: unknown }).id !== 'string') {
           throw new BackendError(400, 'id is required');
         }
         return v as { id: string };
       },
       handler: ({ input }) => ({ id: input.id, label: `widget-${input.id}` }),
     }),
   };
   ```

2. Register it in `src/server/router.ts`:

   ```ts
   import { widgets } from './routes/widgets';
   export const router = { health, echo, widgets } as const;
   ```

3. Write `src/server/routes/widgets.test.ts` — every route requires a unit test. Drive the route via `runRoute(widgets.get, { input, req })`, not via HTTP.

4. Call it from any client component:

   ```tsx
   const backend = useBackend();
   const w = await backend.widgets.get({ id: '42' });
   ```

   Types are inferred end-to-end from the `router` object. No code generation.

### Middleware

Middleware functions take `(ctx, next)` (Koa/Express style). They can mutate `ctx.meta`, short-circuit by returning without calling `next()`, or wrap errors.

- **Global** — applied to every route, listed in `globalMiddleware` in `src/server/router.ts`.
- **Per-route** — pass `middleware: [...]` to `defineRoute`. Runs *after* global middleware, in declaration order (onion model).

Throw `BackendError(status, message)` to respond with a specific HTTP status; everything else becomes 500.

## Testing

Every route has a co-located `*.test.ts`. Tests exercise the route through `runRoute(...)`, not via the HTTP layer — this keeps them fast and independent of Next.js runtime.

```bash
yarn test
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
- `VERSION` bumps on every commit: patch by default, minor for features, major for breaking.
- No AI/Claude attribution in commit messages.

See `CLAUDE.md` for the full protocol.
