@AGENTS.md

# Project rules (shadcn-nextjs-boilerplate)

This is a **boilerplate**, not a product. Keep scaffolding generic and reusable.

## Spec (specificaiton.md)
1. Next.js + shadcn frontend.
2. Backend with middleware layer, consumed via a `useBackend().route.methods` client abstraction.
3. Unit tests required for every backend route.
4. Auto-commit every change. **No Claude watermark ever.**

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

## Backend convention (to be built)
Routes live under `src/app/api/**` (App Router route handlers). Each route is wrapped by a shared middleware pipeline and exposed to the client through a typed `useBackend()` hook:
```ts
const { users } = useBackend();
await users.get({ id });
```
Every route file has a co-located `*.test.ts` exercising the handler directly (not via HTTP).

## Testing
- Unit tests for every backend route — not optional.
- Test the handler function, not the network transport.
