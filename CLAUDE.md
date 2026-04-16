@AGENTS.md

# Project rules (shadcn-nextjs-boilerplate)

This is a **boilerplate**, not a product. Keep scaffolding generic and reusable.

## Spec (specificaiton.md)
1. Next.js + shadcn frontend.
2. Backend with middleware layer, consumed via a `useBackend().route.methods` client abstraction.
3. Unit tests required for every backend route.
4. Auto-commit every change. **No Claude watermark ever.**

## Package manager
Yarn classic (1.x), pinned in `package.json` → `packageManager: "yarn@1.22.22"`. Always run `yarn`, `yarn add`, `yarn install`, `yarn test`, etc. — never `npm`. The lockfile is `yarn.lock`; there must be no `package-lock.json` in this repo.

## Commit discipline
**At the end of every turn where you modified files in response to the user's prompt, commit before yielding control.** This happens *inside* your turn, not via a hook.

Protocol:
1. Stage only files *you* changed (`git add <paths>`). Never `git add -A` — the user may have parallel untracked work (e.g. `prompts/`).
2. Read `VERSION` and bump it:
   - Patch (`0.0.X`) — default, small fix/docs/chore
   - Minor (`0.X.0`) — new user-facing feature
   - Major (`X.0.0`) — breaking change
3. Write the new version back to `VERSION` and include it in the stage.
4. Commit with Conventional Commits format:
   - Subject: `type(scope): short title` where type ∈ {feat, fix, chore, docs, refactor, test, build, style}
   - Body line 1: the new version (e.g. `0.0.2`)
   - Body: terse bullet list of what changed and why
5. **Never** add `Co-Authored-By: Claude`, `Generated with Claude Code`, emoji signatures, or any AI attribution. No HEREDOC footer. Subject + body only.
6. One logical change per commit. Don't bundle unrelated work.

## MCP servers (see `.mcp.json`)
- **shadcn** — use for component installs and registry lookups. Prefer `mcp__shadcn__*` tools over raw `npx shadcn add`.
- **magic** (21st.dev) — frontend component generation / inspiration. Requires `TWENTYFIRST_API_KEY` in env.
- **context7** — authoritative docs for Tailwind, shadcn, Next.js, React. Use this before guessing API shapes, since this Next.js is newer than training data.

## Backend convention

**Hierarchical, type-first, Zod-validated.** Everything routes through one catch-all dispatcher (`src/app/api/[...path]/route.ts`) into the tree in `src/server/`.

### Folder-per-namespace

```
src/server/routes/<namespace>/index.ts         # namespace (methods + middleware)
src/server/routes/<namespace>/index.test.ts
src/server/routes/<namespace>/<sub>/index.ts   # nested namespace
```
A namespace is a folder. Its `index.ts` exports `defineNamespace({ middleware, routes })`. Routes are `defineRoute({ handler, input?, middleware? })`. Sub-namespaces nest under `routes`.

### Types are always named and exported
- Each route file exports `XxxInput` / `XxxOutput` types (use `z.infer<typeof schema>` for inputs; plain TS types for outputs).
- Shared domain types go in `src/types/<domain>.ts`. Promote a type there only once it's used by more than one route.
- **Never** inline `{ foo: string }` in `defineRoute<...>` — it defeats DX and testing.

### Zod validates server inputs
- Every input that crosses the network uses `input: z.ZodType<...>` in `defineRoute`.
- Responses are plain TS types — no runtime validation on outputs.
- `ZodError` is caught by the dispatcher and returned as `BackendError(400, 'VALIDATION', ..., { issues })`.

### Middleware cascades (onion)
- Global middleware attaches to the root router (`src/server/router.ts`).
- Namespace middleware runs for every route inside that namespace *and* its descendants.
- Per-route middleware runs innermost (after all parent middleware, before `validate` + `handler`).
- A child namespace cannot opt out of parent middleware. Model exceptions via restructuring the tree.

### Errors
- Throw `BackendError(status, code, message, details?)` with `code` in the `ErrorCode` union.
- The client reconstructs and re-throws `BackendError` — `catch (err) { if (err instanceof BackendError && err.code === 'VALIDATION') ... }` works with autocomplete.

### Client
- `useBackend()` → recursive Proxy typed from `typeof router`. Call paths map 1:1 to URL paths.
  - `backend.users.admins.list()` → `POST /api/users/admins/list`
- `setBackendHeaders(() => ({...}))` configures headers globally (auth tokens, etc.).
- Prefer throwing in callers; use `safe(...)` from `@/lib/safe` only at call sites that want exhaustive `{ok, data} | {ok, error}`.

## Testing
- Unit tests for every backend route — not optional.
- Use `callRoute(path, { input?, headers? })` from `@/server/testing` — runs the full middleware stack without HTTP.
- Assert on `BackendError` instance + `.code` / `.status` for error paths; `ZodError` for input-validation failures.
