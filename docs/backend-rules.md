# Backend rules

Authoritative guide for anyone (human or LLM) adding, modifying, or calling backend code in this repo.

## Architecture in 30 seconds

The backend is a typed route tree rooted at `src/server/router.ts`. A single catch-all dispatcher at `src/app/api/[...path]/route.ts` resolves the URL path, walks the tree, collects middleware at every level, runs the pipeline (global → namespace → nested namespace → per-route → `validate` → `handler`), and returns JSON. The frontend consumes it via `useBackend()` — a recursive Proxy typed from `typeof router`. Adding a route on the server immediately makes it available and typed on the client with no codegen.

## Core concepts

- **Route** — a leaf of the tree. `defineRoute<Input, Output>({ input?: zodSchema, middleware?: [...], handler })`. The handler is the business logic. `input` is an optional Zod schema that validates the wire payload. Handler receives `{ input, req, meta, log }` — `log` is a request-scoped `Logger` (see **Logging** below).
- **Namespace** — a branch. `defineNamespace({ middleware?: [...], routes: { ... } })`. Groups routes and/or nested namespaces and may attach middleware that cascades to every descendant.
- **Middleware** — `(ctx, next) => Promise<unknown>`. Koa/Express style. Reads `ctx.req`, mutates `ctx.meta` to publish state downstream, calls `next()` to continue, or returns without `next()` to short-circuit.
- **`ctx.meta`** — a plain `Record<string, unknown>` that flows through every middleware and the handler for one request. This is how `requireAuth` hands `user` down to `requireAdmin` and the handler body.
- **`BackendError`** — the only throw the dispatcher serializes cleanly. `new BackendError(status, code, message, details?)`. `code` is a literal-union from `ErrorCode` in `src/server/errors.ts`.
- **`useBackend()`** — a recursive `Proxy`. Property access traverses the tree (no network); invocation sends a `POST` to the assembled URL path. Types come from `typeof router`.
- **`setBackendHeaders(() => ({...}))`** — global header injector. Used for auth tokens, user id, tenant, trace id.
- **`safe(promise)`** — optional Result-style wrapper: turns a throwing call into `{ ok: true, data } | { ok: false, error: BackendError }` for exhaustive call-site handling.

## End-to-end request flow

A call from the client to a handler and back:

```
backend.users.admins.list()
  ↓     client Proxy assembles path ["users","admins","list"]
POST /api/users/admins/list                     body: (none, or JSON from the arg)
  ↓     dispatcher: resolvePath(router, path)
resolvePath walks router → users → admins → list
  ↓     collects middleware as it descends: [logging, requireAuth, requireAdmin]
runRoute runs the onion:
  logging(before)
    requireAuth(before)      reads x-user-id header, sets ctx.meta.user
      requireAdmin(before)   reads ctx.meta.user, throws if role !== 'admin'
        validate(input)      runs input.parse(body) if Zod schema is present
          handler(ctx)       the business logic; returns User[]
      requireAdmin(after)
    requireAuth(after)
  logging(after)
  ↓
dispatcher serializes return → NextResponse.json → HTTP 200 + body
  ↓     BackendError → { error, code, status, details? } + matching HTTP status
  ↓     ZodError     → auto-converted to BackendError(400, 'VALIDATION', ..., { issues })
  ↓     any other throw → 'INTERNAL' 500 + console.error
client parses JSON. On !res.ok it reconstructs a BackendError and throws it.
caller either catches (default) or uses safe() to receive a Result.
```

Four things to burn in:

1. **`ctx.meta` is the shared bag** flowing down the pipeline. Outer middleware writes; inner middleware and the handler read.
2. **Middleware that calls `next()` wraps everything after it** (onion). Middleware that *doesn't* call `next()` short-circuits — the handler never runs.
3. **Only `BackendError` and `ZodError` cross the wire as typed errors.** Raw `Error` becomes `INTERNAL 500` and should never happen in your code.
4. **The URL path is the traversal path.** `backend.a.b.c()` → `POST /api/a/b/c`. Always.

## The 12 rules

### R1. All types live in `src/types/<domain>.ts`
Every route I/O type, every domain model, every Zod schema — all in `src/types/<domain>.ts`, one file per domain. Route files import. They never declare types.

**Why:** single source of truth; tests, mocks, and components all reference the same symbols.

### R2. Every `defineRoute` has explicit generics
`defineRoute<InputType, OutputType>({...})`. Never drop the generics, never inline `{ foo: string }`.

**Why:** forces the type to be named (therefore centralized in `src/types/`) and makes the handler's return contract explicit.

### R3. Every route returns typed data
The `OutputType` generic must be a named type imported from `src/types/`. Do not rely on inference from the handler body.

**Why:** client gets a concrete, stable type. Handler refactors can't silently change the public shape.

### R4. Zod validates every wire input
Every route whose input crosses the network declares `input: zodSchema` on `defineRoute`. No hand-written `validate` functions. No trusting client types.

**Why:** protection against bad requests, exploits, bugs. Runtime + compile-time safety from a single schema.

### R5. Responses are not validated at runtime
Outputs are plain TS types. The server just built the value — double-checking is ceremony.

### R6. Middleware attaches at the right level
- **Global** (logging, tracing, CORS) → root `router.ts` `defineNamespace({ middleware: [...] })`.
- **Namespace-wide** (auth, tenant, rate limit) → the namespace's `defineNamespace({ middleware: [...] })`.
- **Route-specific** → `defineRoute({ middleware: [...] })`.

Middleware cascades top-down. A nested namespace **cannot** opt out of a parent's middleware. If you think you need that, restructure the tree.

### R7. Errors are `BackendError(status, code, message, details?)`
- `code` is a literal-union value from `ErrorCode` in `src/server/errors.ts`. Need a new code? Add it to the union first.
- `ZodError` is caught by the dispatcher and mapped to `BackendError(400, 'VALIDATION', ..., { issues })`. Don't catch it yourself.
- Never throw raw `Error` from handlers/middleware — the dispatcher turns unknown throws into `INTERNAL 500`.

### R8. Every route has a co-located unit test
- Path: `src/server/routes/<...>/index.test.ts`.
- Drive routes via `callRoute(path, { input?, headers? })` from `@/server/testing` — runs the full middleware stack in-process, no HTTP.
- Required coverage per route:
  - Happy path (typed return).
  - Zod validation failure (if `input` is declared).
  - Auth failure (if under `requireAuth`).
  - Domain errors the handler can throw (`NOT_FOUND`, `CONFLICT`, etc.).

### R9. Client never imports server code
The frontend imports types from `@/types/*` and the Proxy from `@/lib/backend`. That's it. It never imports from `@/server/*` — not handlers, middleware, schemas, or the router.

**Why:** keeps the server bundle out of the client. Accidental DB/secret imports from a client component would otherwise leak.

### R10. All outbound headers go through `setBackendHeaders`
Auth tokens, user id, tenant — all injected via `setBackendHeaders(() => ({...}))`. Do not wrap `fetch`, do not fork the client, do not pass headers per-call.

**Why:** single point of control for auth plumbing.

### R11. Routes are top-level consts; `defineNamespace.routes` only references identifiers
(Organization rule: see `docs/organization.md` for repo-wide file-length and split thresholds.)

Never inline a `defineRoute({...})` body inside a `defineNamespace({...})` call. Each route is declared as its own top-level `const` above the namespace, and the namespace's `routes` object is a tiny shorthand map:

```ts
const list = defineRoute<void, ListUsersOutput>({
  handler: () => usersDb,
});

const get = defineRoute<GetUserInput, GetUserOutput>({
  input: getUserInputSchema,
  handler: ({ input }) => { /* ... */ },
});

export const users = defineNamespace({
  middleware: [requireAuth],
  routes: { list, get, admins },    // identifiers only — no inline defineRoute
});
```

If a single route outgrows the namespace file (rule of thumb: handler body ~30 lines or more), split it into its own file in the same folder (e.g. `users/get.ts`) and import the `const`.

**Why:** the namespace block stays a one-screen table of contents you can skim; diffs to a single method don't thrash the namespace definition; refactors like reordering, renaming, extracting, or deleting a route touch one `const`, not a nested block.

### R12. Every backend addition ships with its tests in the same commit
R8 made this hard for routes. **R12 generalizes it to everything under `src/server/**`.**

Anything with logic gets a co-located `*.test.ts`:

| Module                              | Test location                              | Minimum coverage                                                |
|-------------------------------------|--------------------------------------------|-----------------------------------------------------------------|
| A route                             | `src/server/routes/<ns>/index.test.ts`     | See R8's matrix (happy, validation, auth, domain errors).       |
| A middleware                        | co-located `<name>.test.ts`                | Pass-through happy path + every failure mode it can throw.      |
| Pipeline / resolve / dispatcher helpers | co-located `<name>.test.ts`            | Every branch of the resolution or pipeline logic.               |
| Logger / env / infra module         | co-located `<name>.test.ts`                | Level filtering, env defaults, formatting, child context, etc.  |
| Helpers under `src/server/lib/`     | co-located `<name>.test.ts`                | Happy path + each documented edge case.                         |
| Data module under `src/server/db/`  | co-located `<name>.test.ts`                | Each query/mutation's happy path and any constraint it enforces.|

What does **not** need tests:
- Type-only files (`src/types/**`) — the compiler is the test.
- Pure seed data (e.g. `src/server/db.ts` as shipped) — no logic.
- Namespace barrel lines inside a route `index.ts` when the routes themselves are tested.

**Rules of the road:**
1. Tests land in the **same commit** as the code they cover. Never "I'll add tests next PR".
2. A PR that modifies a tested module must update or extend the test — not leave it stale.
3. If you remove a module, delete its test file too.
4. CI is `yarn test` + `yarn tsc --noEmit`. Both must be green before a commit ships.

**Why:** spec requirement #3 for routes, applied uniformly. Tests are the only thing that lets future changes (LLM or human) refactor fearlessly; skipping them on anything non-trivial is how silent regressions arrive.

## Middleware patterns

### How `requireAuth` and `requireAdmin` work

Canonical read-write pattern for cascading middleware:

```ts
// src/server/middleware/auth.ts
export const requireAuth: Middleware = async (ctx, next) => {
  const id = ctx.req.headers.get('x-user-id');
  if (!id) throw new BackendError(401, 'UNAUTHORIZED', 'missing x-user-id header');
  const user = usersDb.find((u) => u.id === id);
  if (!user) throw new BackendError(401, 'UNAUTHORIZED', `unknown user: ${id}`);
  ctx.meta.user = user;                      // publish to downstream
  return next();
};

export const requireAdmin: Middleware = async (ctx, next) => {
  const user = ctx.meta.user as User | undefined;
  if (!user) throw new BackendError(500, 'INTERNAL', 'requireAdmin must run after requireAuth');
  if (user.role !== 'admin') throw new BackendError(403, 'FORBIDDEN', 'admin access required');
  return next();
};
```

The key pattern: middleware **reads from upstream context** (a header or a prior middleware's `ctx.meta` write) and **publishes to downstream** via `ctx.meta`. Order matters — never list `requireAdmin` without `requireAuth` somewhere above it.

### Three ways to gate a route on a role

| You want…                                                 | Do                                                                          |
|-----------------------------------------------------------|------------------------------------------------------------------------------|
| Most of a namespace is open, one method is admin-only    | `defineRoute({ middleware: [requireAdmin], … })` on that one route           |
| A logical cluster of admin-only methods                  | Nested `defineNamespace({ middleware: [requireAdmin], … })` (see `users/admins`) |
| An entire feature area is admin-only                     | Namespace middleware: `defineNamespace({ middleware: [requireAuth, requireAdmin], … })` |

Always list `requireAuth` before `requireAdmin` in the chain — `requireAuth` populates the `user` that `requireAdmin` reads.

## Errors end-to-end

**Server side** — throw `BackendError` with a typed `code`:
```ts
throw new BackendError(404, 'NOT_FOUND', `user ${id} not found`, { id });
```

**Dispatcher serializes:**
```json
{ "error": "user u_99 not found", "code": "NOT_FOUND", "status": 404, "details": { "id": "u_99" } }
```
Returned with HTTP status `404`.

**Client reconstructs and re-throws** — same shape, same instance class:
```ts
// inside @/lib/backend.ts, on !res.ok:
throw new BackendError(404, 'NOT_FOUND', 'user u_99 not found', { id: 'u_99' });
```

**Caller catches and narrows on `.code`:**
```ts
try {
  const u = await backend.users.get({ id });
} catch (err) {
  if (err instanceof BackendError && err.code === 'NOT_FOUND') {
    // err.status === 404, err.details.id === 'u_99' — all autocompleted
  } else { throw err; }
}
```

**`ZodError` shortcut:** a handler/validator that throws a `ZodError` is auto-converted by the dispatcher to `BackendError(400, 'VALIDATION', firstIssue.message, { issues })`. Don't catch `ZodError` manually; let it bubble.

**Error codes** (`src/server/errors.ts`):

| Code            | Status | Use when…                                              |
|-----------------|--------|--------------------------------------------------------|
| `VALIDATION`    | 400    | input failed Zod, or a business-rule validation failed |
| `UNAUTHORIZED`  | 401    | request is not authenticated                          |
| `FORBIDDEN`     | 403    | authenticated but not allowed                         |
| `NOT_FOUND`     | 404    | the requested resource doesn't exist                  |
| `CONFLICT`      | 409    | resource state conflicts with the request (dup name, stale etag) |
| `INTERNAL`      | 500    | unexpected — shouldn't ever be thrown on purpose      |

Need a new code? Add it to the `ErrorCode` union first, then use it.

## Calling from the client

### The Proxy mental model

`useBackend()` returns a recursive `Proxy`. Property access (`backend.users.admins`) traverses the tree — no network. Invocation (`.list()`) sends the request. No runtime route registry — types come entirely from `typeof router`, so:

```ts
backend.health.ping()              // POST /api/health/ping
backend.echo.say({ message })      // POST /api/echo/say, body: {"message": "..."}
backend.users.list()               // POST /api/users/list
backend.users.admins.list()        // POST /api/users/admins/list
```

Server adds a route → client types update instantly. No codegen, no import of server code.

### Headers — single global source

```ts
import { setBackendHeaders } from '@/lib/backend';

// after login:
setBackendHeaders(() => ({ 'x-user-id': session.userId }));
```

Every call after this carries the header. Don't wrap `fetch`, don't fork the client, don't pass per-call (R10).

### Throw (default) vs `safe()` (opt-in)

**Throw — the default:**
```ts
try {
  const u = await backend.users.get({ id });
} catch (err) {
  if (err instanceof BackendError && err.code === 'NOT_FOUND') notFound();
  else throw err;  // let React / React Query handle the rest
}
```

**`safe()` — Result-style when throw feels noisy:**
```ts
import { safe } from '@/lib/safe';

const r = await safe(backend.users.get({ id }));
if (!r.ok) {
  if (r.error.code === 'NOT_FOUND') return notFound();
  return showError(r.error.message);
}
render(r.data);  // r.data typed as User
```

| Reach for…  | When…                                                                                       |
|-------------|---------------------------------------------------------------------------------------------|
| throw       | default; integrates with React Query / SWR / error boundaries; happy path is the common case |
| `safe()`    | multiple error codes to branch on; Server Actions or server helpers; nested try/catch getting ugly |

Don't mix the two styles at a single call site.

## Logging

Every route receives a request-scoped `Logger` as `ctx.log`. Use it instead of `console.log`.

### Shape

```ts
interface Logger {
  debug(msg: string, meta?: LogContext): void;
  info(msg: string,  meta?: LogContext): void;
  warn(msg: string,  meta?: LogContext): void;
  error(msg: string, err?: unknown, meta?: LogContext): void;
  child(context: LogContext): Logger;     // adds fields to every log below this point
}
```

### Inside a handler or middleware

```ts
const get = defineRoute<GetUserInput, GetUserOutput>({
  input: getUserInputSchema,
  handler: ({ input, log }) => {
    log.debug('looking up user', { id: input.id });
    const found = usersDb.find((u) => u.id === input.id);
    if (!found) {
      log.warn('user not found', { id: input.id });
      throw new BackendError(404, 'NOT_FOUND', `user ${input.id} not found`);
    }
    return found;
  },
});
```

`ctx.log` comes pre-populated by the `logging` global middleware with `{ requestId, method, path }` — every line inside a request automatically carries those fields.

### What the global middleware already logs

You get these for free on every request (see `src/server/middleware/logging.ts`):

| Event            | Level | Fields                                                |
|------------------|-------|--------------------------------------------------------|
| request start    | debug | requestId, method, path                               |
| request ok       | info  | requestId, method, path, durationMs                   |
| request failed (BackendError) | warn  | requestId, ..., durationMs, status, code |
| request crashed (unknown throw) | error | requestId, ..., durationMs, error: { name, message, stack } |

So handlers only need to log **their own** interesting events — don't re-log timing or request IDs.

### Env vars (see `.env`)

| Var            | Values                           | Default                                        |
|----------------|----------------------------------|------------------------------------------------|
| `APP_ENV`      | `development` \| `production`    | `NODE_ENV` if set, else `development`          |
| `LOG_ENABLED`  | `true` \| `false`                | `true` (or `false` when `NODE_ENV=test`)       |
| `LOG_LEVEL`    | `debug` \| `info` \| `warn` \| `error` | `debug` in dev, `info` in prod           |

### Output formats

- **Development** — pretty single-line: `INFO  10:30:00 request ok {"requestId":"...","durationMs":23}` (readable during `yarn dev`).
- **Production** — one JSON object per line — pipes straight into Datadog / Grafana / Loki / CloudWatch / etc.

### Rules

- Use `ctx.log`, not raw `console.*` — your logs stay silent in tests and respect level filtering.
- Include a `{ ... }` meta bag for every interesting value; don't string-concat into `msg`.
- Use `log.child({ ... })` when you're about to emit many lines with the same extra context (e.g. processing a batch — `const batchLog = log.child({ batchId })`).
- Don't log payloads that may contain PII, secrets, or tokens.
- Outside a request (startup code, scheduled tasks), import `{ logger } from '@/server/logger'` and use the root logger directly.

## How to add a method

Always two files, in this order:

### 1. Contract — `src/types/<domain>.ts`
```ts
import { z } from 'zod';

export const createInputSchema = z.object({ title: z.string().min(1).max(200) });
export type CreateInput = z.infer<typeof createInputSchema>;
export type CreateOutput = { id: string; title: string };
```

### 2. Behavior — `src/server/routes/<domain>/index.ts`
```ts
import { defineNamespace, defineRoute } from '@/server';
import {
  createInputSchema,
  type CreateInput,
  type CreateOutput,
} from '@/types/<domain>';

const create = defineRoute<CreateInput, CreateOutput>({
  input: createInputSchema,
  handler: ({ input }) => ({ id: crypto.randomUUID(), title: input.title }),
});

export const <domain> = defineNamespace({
  routes: { create },
});
```
Each route is its own top-level `const`. The namespace's `routes` object is just identifiers (R11).

### 3. Register (first time only) — `src/server/router.ts`
Add the namespace to `routes: {...}`.

### 4. Test — `src/server/routes/<domain>/index.test.ts`
Cover the R8 matrix.

### 5. Verify
`yarn test` and `yarn tsc --noEmit` must be clean.

## Common antipatterns (don't do these)

| Instead of…                                             | Do this                                               |
|---------------------------------------------------------|-------------------------------------------------------|
| `defineRoute<{id:string}, User>(...)`                   | Put types in `src/types/<domain>.ts`, import, reuse. |
| `defineRoute({ handler: () => ({...}) })` (no generics) | `defineRoute<I, O>({...})`.                           |
| Custom `validate: (v) => ...` function                  | `input: zodSchema`.                                   |
| `throw new Error('not found')`                          | `throw new BackendError(404, 'NOT_FOUND', ...)`.      |
| `code: 'CUSTOM_ERROR' as any`                           | Add `CUSTOM_ERROR` to `ErrorCode` union first.        |
| `if (role !== 'admin') return 403` in handler           | Use `requireAdmin` middleware.                        |
| `fetch('/api/...')` from a component                    | Use `useBackend()`.                                   |
| `import { handler } from '@/server/routes/...'` in a client component | Only types from `@/types/*` in client code. |
| `routes: { list: defineRoute<...>({...}), get: defineRoute<...>({...}) }` inline | Declare each route as a top-level `const` above the namespace (R11). |
| Shipping a new middleware / helper / pipeline tweak without a co-located `*.test.ts` in the same commit | Add the test alongside the code; see R12 for the coverage table.       |

## LLM checklist before submitting a backend change

- [ ] Are all new types in `src/types/<domain>.ts`?
- [ ] Do all new `defineRoute` calls have explicit generics?
- [ ] Does every new input use a Zod schema?
- [ ] Do all new error codes exist in `ErrorCode`?
- [ ] Does every new/changed route have a co-located test covering R8's matrix?
- [ ] Does **every** new/changed backend module (middleware, pipeline logic, helper, db module, …) ship with a co-located `*.test.ts` in this same commit (R12)?
- [ ] Are all routes top-level consts (R11)? No inline `defineRoute` inside `defineNamespace.routes`?
- [ ] Does `yarn test` pass? Is `yarn tsc --noEmit` clean?
- [ ] Is `VERSION` bumped correctly (patch/minor/major)?
- [ ] Did the commit include only backend-related files (no accidental `prompts/`, demos, etc.)?
