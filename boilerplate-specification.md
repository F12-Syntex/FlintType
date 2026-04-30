# Boilerplate Specification

Complete feature inventory for flinttype's scaffolding base. This documents what is shipped, not how to use it.

**Version:** 0.19.2  
**Last updated:** 2026-04-17

---

## Core Foundation

### Framework & UI
- **Next.js 16+** with App Router (async/await server components, streaming, cache layers)
- **React 19** with latest hooks (`use`, `useActionState`, `useTransition`)
- **shadcn/ui** primitives (Button, Input, Dialog, Select, Tabs, Card, Badge, etc.) installed and ready
- **Tailwind CSS** with mobile-first responsive utilities (375px baseline, sm:/md:/lg: breakpoints)
- **Dark mode** (light/dark CSS variables) + six community palettes (Claude, Supabase, T3 Chat, Mocha Mousse, Caffeine, Amethyst Haze) via `<ThemeSwitcher>` and `<ModeToggle>`

### Backend Architecture
- **Typed route tree** with `defineRoute<Input, Output>` and `defineNamespace` primitives
- **Middleware pipeline** (Koa-style) with request-scoped context (`ctx.meta`, `ctx.log`, `ctx.db`)
- **Single dispatcher** at `src/app/api/[...path]/route.ts` — routes are type-safe, auto-discovered from the tree
- **Client abstraction** (`useBackend()` Proxy) — property access traverses the tree, invocation sends POST to assembled path
- **Error handling** — only `BackendError` and `ZodError` cross the wire, raw `Error` becomes HTTP 500
- **Input validation** — all route inputs declare Zod schemas; invalid input returns `VALIDATION` 400 automatically
- **Structured logging** — every request gets a `requestId`, `method`, `path` pre-populated in `ctx.log`; JSON in prod, pretty-print in dev

---

## Authentication

### Clerk Integration
- **Clerk OAuth** with session JWT (keyless mode in dev, real keys in `.env.local` for prod)
- **`auth()` from `@clerk/nextjs/server`** — reads the session, returns `userId` + `sessionClaims`
- **`requireAuth` middleware** — gates a route on signed-in user; sets `ctx.meta.userId` and `ctx.meta.sessionClaims`
- **`requireAdmin` middleware** — gates on `sessionClaims.metadata.role === 'admin'`; must run after `requireAuth`
- **`requireAdminOrDev` middleware** — for dev-only inspection surfaces (e.g. `/admin/database`); allows all traffic in `APP_ENV=development`, enforces admin in prod
- **Local users mirror** (`ensureUser()`) — Clerk owns identity; the local `users` table materializes rows for FKs. `ensureUser(ctx)` handles the first-access fallback to Clerk
- **UI components** — `<Show when="signed-in|signed-out">`, `<SignInButton mode="modal">`, `<SignUpButton mode="modal">`, `<UserButton />`

### Public Pages
- `/` — homepage (home.tsx, no auth required)
- `/sign-in/[[...sign-in]]` — Clerk-hosted sign-in modal
- `/sign-up/[[...sign-up]]` — Clerk-hosted sign-up modal

### Authenticated Pages
- `/admin` — database explorer, admin-only (gated by `requireAdminOrDev`)
- `/billing` — subscription management via Clerk Billing, `noIndex: true` (private)

---

## Database Layer

### Two-Tier Architecture
- **Server** (production): Neon Postgres in `@neondatabase/serverless` (HTTP driver, no connection pool). Local dev uses PGlite-Node for instant setup.
- **Client** (browser): PGlite in IndexedDB (zero server roundtrips for reads).
- **ORM**: Drizzle, same schema on both tiers.

### Schema (Shared)
- **`users`** — local mirror of Clerk identities (`id`, `email`, `name`, `imageUrl`, `role`, `createdAt`, `updatedAt`)
- **`posts`** — demo table (`id`, `title`, `content`, `authorId` FK to users, `createdAt`)
- **`notes`** — client-only table in browser PGlite (`id`, `text`, `createdAt`) for sync demo

### Data Access
- **Server routes** — `ctx.db.<repo>.<method>()` (e.g. `ctx.db.posts.list()`, `ctx.db.users.findById(id)`)
- **Client components** — `const db = useLocalDb(); await db.notes.list()` (React hook)
- **Repositories** — one file per domain (`src/db/server/repositories/posts.ts`, `src/db/client/repositories/notes.ts`); each repo is a factory `(drizzle) => { list, findById, create, ... }`

### Migrations
- **Server** — Drizzle Kit generates SQL files (`src/db/migrations/server/`); apply with `yarn db:migrate`
- **Client** — programmatic `CREATE TABLE IF NOT EXISTS` in `ensureClientSchema()` on first query; idempotent, per-user

---

## Backend Routes

### Route Namespaces

#### `health` — Liveness checks
- `health.ping()` — returns `{ ok: true }`, no auth required

#### `echo` — Request echo
- `echo.say({ message })` — echoes back the message, no auth required

#### `users` — User directory
- `users.list()` — lists all users from Clerk, no auth required (demo only)
- `users.me()` — current authenticated user's profile (requires `requireAuth`)
- `users.admins.list()` — lists admin-only users (requires `requireAuth` + `requireAdmin`)
- `users.admins.invite({ email, role })` — (not yet wired; placeholder)

#### `posts` — CRUD blog posts
- `posts.list()` — paginated list (requires `requireAuth`)
- `posts.get({ id })` — single post lookup (requires `requireAuth`)
- `posts.create({ title, content })` — create a new post as the current user (requires `requireAuth`)

#### `ai` — LLM integration
- `ai.chat({ preset, prompt })` — chat completion via OpenRouter (requires `requireAuth`)
  - `preset` ∈ `['fast', 'smart', 'cheap']`; resolves to concrete model in `src/server/ai/presets.ts`
  - Returns `{ text, preset, model, usage: { totalTokens, totalCostUsd } }`

#### `premium` — Plan-gated demo
- `premium.ping()` — always returns `{ ok: true }` if user has `user:pro` plan (gated by `requirePlan('user:pro')`)

#### `ratelimit` — Rate-limit demo
- `ratelimit.ping()` — returns `{ ok: true }` but limited to 10 requests / 60 seconds per user (gated by `rateLimit({ limit: 10, windowMs: 60_000 })`)

#### `admin.database` — Inspection only
- `admin.database.health()` — database size, table stats, read/write counts (requires `requireAdminOrDev`)
- `admin.database.tableRows({ table, limit })` — fetch raw rows from any table (requires `requireAdminOrDev`)

---

## Middleware

### Global
- **`logging`** — every request logs with `requestId`, `method`, `path`; success = `info`, error = `warn`, crash = `error`

### Auth & Access
- **`requireAuth`** — 401 if not signed in; sets `ctx.meta.userId` + `ctx.meta.sessionClaims`
- **`requireAdmin`** — 403 if not admin; reads `sessionClaims.metadata.role`
- **`requireAdminOrDev`** — open in dev, admin-only in prod (for local inspection without Clerk)
- **`requirePlan(planKey)`** — 402 if user doesn't have the plan; uses Clerk's `has({ plan })`

### Rate Limiting
- **`rateLimit({ limit, windowMs })`** — fixed-window limiter, keyed by user ID (if auth'd) or IP
  - Throws `RATE_LIMITED` 429 with `{ limit, windowMs, retryAfterMs }` in details
  - Per-user buckets in dev/prod; in-memory (swap to Redis for multi-process)

---

## Frontend Routes & Demos

### Home (`/`)
- Hero section with navigation links
- Demo cards for each backend feature (health, echo, users, posts, AI, premium, rate-limit)
- Backend demo component fetching live data
- Local notes sync demo (browser PGlite)
- AI chat demo
- Premium tier demo (shows 402 if not pro)
- Rate-limit demo

### Admin (`/admin`)
- Database health overview (driver, size, table count)
- Interactive table explorer
- Read-only; gated by `requireAdminOrDev`

### Billing (`/billing`)
- Clerk Billing embedded UI
- Manage subscriptions, payment methods, plan selection
- Dev setup notice when `IS_DEV=true`
- `noIndex: true` (authenticated surface)

### Auth
- `/sign-in/[[...sign-in]]` — Clerk hosted
- `/sign-up/[[...sign-up]]` — Clerk hosted

---

## Features & Utilities

### Logging
- **Structured JSON** per request (`requestId`, `method`, `path` always included)
- **Log levels** — `debug`, `info`, `warn`, `error` (dev: debug, prod: info)
- **`ctx.log`** — request-scoped logger
- **`logger`** — root logger for startup code
- **Output** — JSON in prod (pipe to Datadog, Loki, Grafana), pretty single-line in dev

### Theming & Appearance
- **CSS variables** in `globals.css` and `themes.css` (light/dark + six community palettes)
- **`<ThemeSwitcher>`** — palette picker (Claude, Supabase, T3 Chat, Mocha Mousse, Caffeine, Amethyst Haze)
- **`<ModeToggle>`** — light/dark toggle
- **Sync** via `localStorage` and `suppressHydrationWarning` FOUC prevention

### AI Integration
- **OpenRouter** API (access to 100+ models)
- **Vercel AI SDK** — `generateText()`, `generateChat()`, streaming support
- **Presets** in `src/server/ai/presets.ts` — single edit point for model swaps
  - `ai.fast()` → `gpt-4o-mini`
  - `ai.smart()` → `claude-sonnet-4`
  - `ai.cheap()` → `gpt-4o-mini`
- **Usage tracking** via OpenRouter dashboard + Langfuse broadcast (optional)
- **No per-call DB logging** by design (let OpenRouter own the analytics)

### Payments / Plan Gating
- **Clerk Billing** — native Clerk billing surface
- **Plan registry** (`src/server/plans.ts`) — canonical mapping of plan names to Clerk plan keys
  - `PLANS.pro = 'user:pro'`
  - Never hand-write the `user:` prefix outside this file
- **`requirePlan(planKey)` middleware** — gates routes on plan membership; throws 402 if user lacks plan
- **UI gating** — conditional rendering based on `await auth().has({ plan })`

### Testing
- **`yarn test`** — vitest (36 test suites, 239+ tests)
- **R12 co-located tests** — every backend module (`src/server/**`) with logic ships with `*.test.ts`
- **Route testing** — `callRoute(path, { input?, headers? })` helper runs full middleware stack in-process
- **Mocking** — Clerk (`auth`, `clerkClient`), AI SDK (`generateChat`), and DB are mocked at module boundaries
- **Database tests** — real PGlite instances via `createTestDatabase()`, no mocks

### Environment & Config
- **`src/server/env.ts`** — centralized env var parsing and validation (Zod)
- **`.env`** — committed defaults (no secrets)
- **`.env.local`** — gitignored (secrets: `CLERK_SECRET_KEY`, `OPENROUTER_API_KEY`, `DATABASE_URL`)
- **Variables**:
  - `APP_ENV` — `development` | `production`
  - `LOG_ENABLED` — log output on/off
  - `LOG_LEVEL` — `debug` | `info` | `warn` | `error`
  - `DATABASE_URL` — Neon connection string (optional; auto-PGlite if unset)
  - `DATABASE_MODE` — `auto` | `neon` | `pglite`
  - `OPENROUTER_API_KEY` — sk-or-v1-... (optional; only `ai.chat` fails without it)
  - `CLERK_*` — Clerk keys (optional in dev with keyless mode; required in prod)

---

## Quality & Discipline

### Testing Coverage
- **Unit tests** required for every route (R8): happy path, Zod validation failure, auth failure, domain errors
- **Integration tests** for middleware and helpers
- **Test speed** — all 239 tests complete in ~3 seconds (in-memory PGlite, no network)

### Type Safety
- **Generics on every `defineRoute<I, O>`** (R2)
- **All types in `src/types/<domain>.ts`** (R1)
- **Zero TypeScript errors** in CI
- **Zod schemas for all wire input**
- **Client never imports from `src/server/**`** (R9)

### Code Organization
- **Files ≤200 lines** — hard rule at ~300 (docs/organization.md)
- **Single purpose** per file
- **No junk-drawer files** (utils.ts, helpers.ts forbidden)
- **Routes are top-level consts**, not inline in namespace (R11)

### UI Law & Design
- **Mobile-first mandatory** (375px baseline, scale up with sm:/md:/lg:)
- **Palette fixed** — zinc + red only, six swappable community themes
- **Three-state feedback** — loading, success, error states on every async action
- **Accessibility** — 44×44px touch targets, labels on inputs, semantic HTML

### SEO
- **Metadata on every page** (S1, S4 canonical)
- **Semantic HTML** — one h1 per page, proper nesting
- **`public/llms.txt`** — LLM crawler guide (llmstxt.org)
- **`src/app/sitemap.ts`** — XML sitemap auto-generated
- **`public/robots.txt`** — allow all except `/api/` and `/_next/`

### Commit Discipline
- **Conventional Commits** — `type(scope): title` + body
- **Auto-commit on every turn** (no waiting for PR)
- **VERSION bumped** in each commit (patch/minor/major)
- **No Claude watermark** — never attribute work to Claude
- **Tests ship with code** — same commit (R12)

---

## File Structure

```
src/
├── app/                          # Next.js App Router pages & layouts
│   ├── layout.tsx                # Root layout (Clerk, ThemeSwitcher, topbar)
│   ├── page.tsx                  # Home page
│   ├── admin/                    # Admin surface
│   │   ├── page.tsx
│   │   └── _components/
│   ├── billing/                  # Billing / subscription management
│   │   └── page.tsx
│   ├── sign-in/[[...sign-in]]/   # Clerk sign-in
│   └── sign-up/[[...sign-up]]/   # Clerk sign-up
├── components/
│   ├── ui/                       # shadcn primitives (auto-generated)
│   ├── theme-switcher.tsx        # Palette + dark mode UI
│   └── ...
├── db/
│   ├── schema/                   # Shared Drizzle schema (both tiers)
│   │   ├── users.ts
│   │   ├── posts.ts
│   │   └── notes.ts
│   ├── server/                   # Server-tier (Neon / PGlite-Node)
│   │   ├── driver.ts             # Driver factory
│   │   ├── index.ts              # Database singleton
│   │   ├── repositories/         # Data access layer
│   │   ├── migrate.ts            # Migration runner
│   │   └── testing.ts            # Test database helper
│   ├── client/                   # Client-tier (browser PGlite)
│   │   ├── hook.ts               # useLocalDb() React hook
│   │   ├── init.ts               # Schema initialization
│   │   └── repositories/         # Client-side repos
│   └── migrations/
│       └── server/               # Generated SQL migrations
├── lib/
│   ├── backend.ts                # useBackend() Proxy + setBackendHeaders()
│   ├── errors.ts                 # BackendError class, ErrorCode union
│   ├── safe.ts                   # safe() Result wrapper
│   ├── themes.ts                 # Theme registry (THEMES array)
│   ├── use-async-action.ts       # useAsyncAction hook (loading/error/data)
│   └── seo.ts                    # buildPageMetadata() helper
├── server/
│   ├── index.ts                  # Public API (defineRoute, defineNamespace)
│   ├── router.ts                 # Root router
│   ├── types.ts                  # RouteDef, NamespaceDef, Context types
│   ├── env.ts                    # Env var parsing (Zod)
│   ├── logger.ts                 # Structured logging
│   ├── plans.ts                  # Plan registry (PLANS, PlanName, PlanKey)
│   ├── ai/                       # AI integration
│   │   ├── index.ts              # generateChat(), ai.fast/smart/cheap
│   │   ├── presets.ts            # Model mapping (edit here only)
│   │   └── provider.ts           # OpenRouter provider
│   ├── middleware/               # Middleware layer
│   │   ├── logging.ts            # Request/response logging
│   │   ├── auth.ts               # requireAuth, requireAdmin
│   │   ├── admin-gate.ts         # requireAdminOrDev
│   │   ├── rate-limit.ts         # Fixed-window rate limiter
│   │   └── require-plan.ts       # Plan gating
│   ├── routes/                   # Namespace tree
│   │   ├── admin/                # Admin-only inspection
│   │   ├── ai/                   # AI routes
│   │   ├── echo/                 # Echo demo
│   │   ├── health/               # Liveness
│   │   ├── posts/                # CRUD blog posts
│   │   ├── premium/              # Plan-gated demo
│   │   ├── ratelimit/            # Rate-limit demo
│   │   └── users/                # User directory
│   ├── middleware.ts             # Dispatcher
│   ├── testing.ts                # callRoute() test helper
│   └── clerk-user.ts             # Clerk → local User mapper
├── types/
│   ├── admin.ts                  # Admin types (DatabaseHealth, TableStats)
│   ├── ai.ts                     # AI types (Preset, ChatOutput, etc.)
│   ├── user.ts                   # User domain
│   ├── post.ts                   # Post domain
│   └── ...
├── app/
│   ├── api/
│   │   └── [...path]/
│   │       └── route.ts          # Single dispatcher
│   ├── globals.css               # Root CSS variables (light/dark)
│   └── themes.css                # Community palette overrides
└── ...

docs/
├── backend-rules.md              # R1–R12 backend discipline rules
├── ui-law.md                     # UI conventions (colors, spacing, typography, mobile-first)
├── organization.md               # File length thresholds, where code goes
├── seo.md                        # S1–S9 SEO rules
├── auth.md                       # Clerk auth guide
├── database.md                   # D1–D8 database layer guide
├── ai.md                         # AI1–AI7 LLM integration guide
└── payments.md                   # Payment/plan gating rules
```

---

## Extensibility

### Adding a Route
1. Define types in `src/types/<domain>.ts`
2. Create route in `src/server/routes/<namespace>/index.ts` as top-level `const`
3. Register in `src/server/router.ts`
4. Add test in `src/server/routes/<namespace>/index.test.ts`
5. Call from client via `useBackend()` — Proxy auto-discovers the new route

### Adding Middleware
1. Create `src/server/middleware/<purpose>.ts`
2. Implement `(ctx, next) => Promise<unknown>` signature
3. Attach to routes or namespaces via `defineRoute({ middleware: [...] })`
4. Add test in `src/server/middleware/<purpose>.test.ts`

### Adding a Database Table
1. Define schema in `src/db/schema/<table>.ts`
2. Create repository in `src/db/server/repositories/<table>.ts`
3. Register in `src/db/server/index.ts` `Database` type
4. Run `yarn db:generate` to create migration
5. Add repo test in `src/db/server/repositories/<table>.test.ts`

### Adding a Page
1. Create `src/app/<route>/page.tsx`
2. Export `metadata` or `generateMetadata` (S1, S4)
3. If new top-level route: add to `src/app/sitemap.ts` and `public/llms.txt` (S7)
4. If admin/private: set `noIndex: true` (S8)

---

## Performance & Deployment

### Local Development
- **`yarn dev`** — Next.js dev server (port 3000) + MCP server (port 5173) auto-enabled
- **PGlite-Node** — SQLite-like in-process DB, no network
- **Keyless Clerk** — temporary keys, "Configure your application" prompt in UI
- **Full-stack HMR** — changes to routes/middleware apply instantly

### Production
- **Vercel** — first-class integration (env vars, Postgres storage, Clerk setup)
- **Neon** — serverless Postgres, HTTP driver (no connection pool)
- **Clerk** — production keys in `.env.local` or platform secret store
- **OpenRouter** — real API key for AI routes
- **Observability** — structured JSON logs (pipe to Datadog), Langfuse for AI traces
- **Build output** — optimized Next.js bundle, route-level code splitting, auto gzip/brotli

---

## Compliance & Rules

All code must satisfy:
- **R1–R12** (backend-rules.md) — route typing, middleware, error handling, testing
- **S1–S9** (seo.md) — metadata, sitemap, robots, llms.txt
- **UI Law** (ui-law.md) — mobile-first, color palette, spacing, accessibility
- **D1–D8** (database.md) — schema sharing, repositories, migrations
- **AI1–AI7** (ai.md) — preset registry, usage tracking, auth requirement
- **A1–A7** (auth.md) — middleware ordering, testing, keyless dev mode
- **P1–P4** (payments.md) — plan registry, gating, usage demo

---

**This is a working boilerplate, not a tutorial.** Every shipped feature is production-ready and tested. Fork, modify, and ship.
