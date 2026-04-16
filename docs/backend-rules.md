# Backend rules

Authoritative guide for anyone (human or LLM) adding, modifying, or calling backend code in this repo.

## Architecture in 30 seconds

The backend is a typed route tree rooted at `src/server/router.ts`. A single catch-all dispatcher at `src/app/api/[...path]/route.ts` resolves the URL path, walks the tree, collects middleware at every level, runs the pipeline (global → namespace → nested namespace → per-route → `validate` → `handler`), and returns JSON. The frontend consumes it via `useBackend()` — a recursive Proxy typed from `typeof router`. Adding a route on the server immediately makes it available and typed on the client with no codegen.

## The 10 rules

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

export const <domain> = defineNamespace({
  routes: {
    create: defineRoute<CreateInput, CreateOutput>({
      input: createInputSchema,
      handler: ({ input }) => ({ id: crypto.randomUUID(), title: input.title }),
    }),
  },
});
```

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

## LLM checklist before submitting a backend change

- [ ] Are all new types in `src/types/<domain>.ts`?
- [ ] Do all new `defineRoute` calls have explicit generics?
- [ ] Does every new input use a Zod schema?
- [ ] Do all new error codes exist in `ErrorCode`?
- [ ] Does every new/changed route have a co-located test covering R8's matrix?
- [ ] Does `yarn test` pass? Is `yarn tsc --noEmit` clean?
- [ ] Is `VERSION` bumped correctly (patch/minor/major)?
- [ ] Did the commit include only backend-related files (no accidental `prompts/`, demos, etc.)?
