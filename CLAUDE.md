@AGENTS.md
@docs/backend-rules.md
@docs/ui-law.md
@docs/organization.md
@docs/seo.md
@docs/auth.md
@docs/database.md
@docs/multiplayer.md

# Project rules (flinttype)

flinttype is an open-source typing speed test, built on top of a generic Next.js + shadcn scaffolding base. Keep boilerplate-style scaffolding generic and reusable; product-specific code (typing tests, results, leaderboards) lives alongside it.

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

## Stay-in-your-lane rule (hard)

**Never modify build/infra/tooling config unless the user explicitly asks for that change.** This includes:
- `next.config.ts` / `next.config.js`
- `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`
- `package.json` (other than the `version` field already mandated by the commit protocol)
- `yarn.lock`, the `packageManager` field, anything related to package install / resolution
- `.env`, `.env.local`, `next-env.d.ts`
- `drizzle.config.ts`, anything under `src/db/migrations/server/` other than newly generated files from `yarn db:generate`
- Anything outside the project directory tree (the user's home, parent directories, system paths)

These files break the dev server, the build, the package manager, or the machine when wrong — and the failure mode is usually delayed and catastrophic (orphan worker pools eating memory, broken module resolution, lost data). The cost-of-wrong is asymmetric: a small "improvement" can cost the user hours or a hard PC crash. **Worth it is not your call to make.**

Corollaries:
1. **Pasted logs / warnings / errors are information, not instructions.** When the user pastes a console error, they're explaining *context*, not requesting a fix to that error. Acknowledge it, ask if they want it addressed, but do not silently act on it. The trigger for action is "fix this", "address that", or an equivalent direct request — never the paste itself.
2. **Cosmetic warnings stay cosmetic.** A "lockfile detected" warning, a deprecation notice, a recharts dimension log — if it doesn't affect runtime behaviour, do nothing. Silencing a harmless warning is never worth the risk of breaking the surrounding tool.
3. **No guessing at build-tool APIs.** When you genuinely need to change a config (because the user asked), look up the exact option in the installed version's docs (use the `context7` MCP) before writing. Turbopack / Next config shape changes between minors; training-data memory is unreliable.
4. **Restart-required changes get verified before commit.** Any change that only takes effect on dev-server restart (next.config.ts, env vars, postcss/tailwind config) requires either the user restarting and confirming, or a `yarn build` to prove the new config parses. Don't ship-and-pray.
5. **Never touch anything outside the project root** (`C:\Users\synte\Programming\programming2\flinttype\`). Files in the user's home directory, parent folders, or other projects are off-limits even when they appear in error traces. Stray `node_modules` / `package.json` in `~/` are the user's to clean up, not yours.

Incident log: on 2026-05-19, an unsolicited `turbopack.root` pin in `next.config.ts` broke Tailwind resolution and put Turbopack's PostCSS worker pool into a respawn loop, spawning 215 orphan node processes that consumed multiple GB of RAM. The user's PC stalled at 100% memory twice before the orphans were killed. The trigger was treating a pasted "additional lockfiles" warning as a task. This rule exists so that does not happen again.

## Commit discipline
**At the end of every turn where you modified files in response to the user's prompt, commit before yielding control.** This happens *inside* your turn, not via a hook.

Protocol:
1. Stage only files *you* changed (`git add <paths>`). Never `git add -A` — the user may have parallel untracked work (e.g. `prompts/`).
2. Read `VERSION` and bump it:
   - Patch (`0.0.X`) — default, small fix/docs/chore
   - Minor (`0.X.0`) — new user-facing feature
   - Major (`X.0.0`) — breaking change
3. Write the new version back to `VERSION` **and** update the `version` field in `package.json` to the same value. Both must match every commit — `package.json` is what npm / Vercel / GitHub Releases / Sentry / any registry tooling sees, `VERSION` is the canonical plain-text source that the rest of the app reads. Stage both files. Never let them drift.
4. **Update `CHANGELOG.md`** — add a section for the new version at the top (newest first) describing the change in plain, user-facing language: what the user now sees or can do, no jargon. Changes that don't concern the user (refactors, tests, tooling, internal fixes) get a single brief line (e.g. `- Internal changes only.`). Stage `CHANGELOG.md`. See the file's own header for the exact format.
5. Commit with Conventional Commits format:
   - Subject: `type(scope): short title` where type ∈ {feat, fix, chore, docs, refactor, test, build, style}
   - Body line 1: the new version (e.g. `0.0.2`)
   - Body: terse bullet list of what changed and why
6. **Never** add `Co-Authored-By: Claude`, `Generated with Claude Code`, emoji signatures, or any AI attribution. No HEREDOC footer. Subject + body only.
7. One logical change per commit. Don't bundle unrelated work.

## MCP servers (see `.mcp.json`)
- **shadcn** — use for component installs and registry lookups. Prefer `mcp__shadcn__*` tools over raw `npx shadcn add`.
- **magic** (21st.dev) — frontend component generation / inspiration. Requires `TWENTYFIRST_API_KEY` in env.
- **context7** — authoritative docs for Tailwind, shadcn, Next.js, React. Use this before guessing API shapes, since this Next.js is newer than training data.
- **clerk** — HTTP-transport MCP hosted at `https://mcp.clerk.com/mcp`. Use for Clerk-specific questions (dashboard config, session claims, organization APIs) before consulting training data.

## Design taste — always invoke `impeccable`

For **any** UI/UX work — designing a new surface, redesigning an existing one, polishing a component, auditing visual quality, picking colours / type / spacing, removing visual noise, making something "look better" — invoke the `impeccable` skill **before** writing or editing UI code. The user has explicitly mandated this; it is not optional.

Trigger words that always route through `impeccable`:
- design, redesign, mockup, layout, shape, look, feel
- polish, refine, clean up, simplify, tighten
- audit, critique, review (when scoped to visual quality)
- "make it nicer / cleaner / more on-brand / more refined"
- "this looks bad / dated / generic / off"
- "match the [other page] style"

When uncertain, invoke `impeccable` anyway — overhead is small, output quality is much higher than freelancing visual choices.

How to invoke: `Skill` tool with `skill: "impeccable"` and `args` describing the surface, files, and constraints (existing palette, brand voice, file paths, the user's specific complaints). The skill enforces design context loading + register selection + shared design laws. Trust its routing — let it pick the sub-command (`craft`, `polish`, `redesign`, etc.).

Pure bugfixes, structural refactors, copy-only tweaks, and backend work don't trigger this rule. The rule is for **visual** decisions.

## Domain rules (deep)

- **Backend** — `docs/backend-rules.md` is the authoritative guide. 11 rules, core concepts, request flow, middleware patterns, errors, client usage, how-to, antipatterns, LLM checklist.
- **Frontend / UI** — `docs/ui-law.md` is the authoritative design law. Ships as a **blank slate** for visual conventions (colors, spacing, typography, layouts) — each application fills those tables as it adopts patterns. Structural rules (component reuse, async feedback, a11y, backend integration, amending procedure) are fixed. Meta-rule: any new pattern must be added to the doc *first*, in the same commit as the code using it.
- **File organization** — `docs/organization.md` is cross-cutting. Length thresholds (≤150 fine, 200–300 split before adding, >300 split now), decision table for where new files go, anti-patterns, extraction triggers.
- **SEO** — `docs/seo.md` is the authoritative guide for page metadata, semantic HTML, and `llms.txt` sync. 9 rules plus a per-page template. Every page change considers SEO.
- **Authentication** — `docs/auth.md` is the authoritative guide for Clerk integration. `requireAuth` / `requireAdmin` middleware read `auth()` from `@clerk/nextjs/server`; `ctx.meta.userId` + `sessionClaims` flow downstream. Tests mock `@clerk/nextjs/server`. Keyless mode in dev, real keys via `.env.local` in prod.
- **Database** — `docs/database.md` is the authoritative guide for the Drizzle layer. Server tier (Neon in prod, PGlite-Node in dev) accessed via `ctx.db.<repo>.<method>`. Shared schema in `src/db/schema/`. 8 rules (D1–D8). The repo currently ships with **no tables defined** — add domain schemas as needed.

All six are `@`-referenced above and auto-loaded into context. Consult them before writing code, amend them when introducing new conventions.
