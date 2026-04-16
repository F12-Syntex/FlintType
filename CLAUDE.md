@AGENTS.md
@docs/backend-rules.md
@docs/ui-law.md
@docs/organization.md
@docs/seo.md
@docs/auth.md
@docs/database.md

# Project rules (shadcn-nextjs-boilerplate)

This is a **boilerplate**, not a product. Keep scaffolding generic and reusable.

## Spec (specificaiton.md)
1. Next.js + shadcn frontend.
2. Backend with middleware layer, consumed via a `useBackend().route.methods` client abstraction.
3. Unit tests required for every backend route.
4. Auto-commit every change. **No Claude watermark ever.**

## Package manager
Yarn classic (1.x), pinned in `package.json` → `packageManager: "yarn@1.22.22"`. Always run `yarn`, `yarn add`, `yarn install`, `yarn test`, etc. — never `npm`. The lockfile is `yarn.lock`; there must be no `package-lock.json` in this repo.

## Environment
`APP_ENV` (`development` | `production`), `LOG_ENABLED`, `LOG_LEVEL` live in `.env` (committed defaults, no secrets). Secrets go in `.env.local` (gitignored). Parsed and validated by `src/server/env.ts`. Full table in `docs/backend-rules.md` → **Logging**.

## Logging
Server-side structured logging via `src/server/logger.ts`. Every handler/middleware receives `ctx.log`, a request-scoped `Logger` pre-populated with `{ requestId, method, path }`. Use it — never raw `console.*`. JSON in prod, pretty single-line in dev. See `docs/backend-rules.md` → **Logging** for usage rules.

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
- **clerk** — HTTP-transport MCP hosted at `https://mcp.clerk.com/mcp`. Use for Clerk-specific questions (dashboard config, session claims, organization APIs) before consulting training data.

## Domain rules (deep)

- **Backend** — `docs/backend-rules.md` is the authoritative guide. 11 rules, core concepts, request flow, middleware patterns, errors, client usage, how-to, antipatterns, LLM checklist.
- **Frontend / UI** — `docs/ui-law.md` is the authoritative design law. Ships as a **blank slate** for visual conventions (colors, spacing, typography, layouts) — each application fills those tables as it adopts patterns. Structural rules (component reuse, async feedback, a11y, backend integration, amending procedure) are fixed. Meta-rule: any new pattern must be added to the doc *first*, in the same commit as the code using it.
- **File organization** — `docs/organization.md` is cross-cutting. Length thresholds (≤150 fine, 200–300 split before adding, >300 split now), decision table for where new files go, anti-patterns, extraction triggers.
- **SEO** — `docs/seo.md` is the authoritative guide for page metadata, semantic HTML, and `llms.txt` sync. 9 rules plus a per-page template. Every page change considers SEO.
- **Authentication** — `docs/auth.md` is the authoritative guide for Clerk integration. `requireAuth` / `requireAdmin` middleware read `auth()` from `@clerk/nextjs/server`; `ctx.meta.userId` + `sessionClaims` flow downstream. Tests mock `@clerk/nextjs/server`. Keyless mode in dev, real keys via `.env.local` in prod.
- **Database** — `docs/database.md` is the authoritative guide for the two-tier Drizzle layer. Server tier (Neon in prod, PGlite-Node in dev) accessed via `ctx.db.<repo>.<method>`. Client tier (browser PGlite) accessed via `useLocalDb()`. Shared schema in `src/db/schema/`. 8 rules (D1–D8).

All six are `@`-referenced above and auto-loaded into context. Consult them before writing code, amend them when introducing new conventions.
