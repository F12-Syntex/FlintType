# Database

Authoritative guide for the database layer. Two independent tiers share one schema:

- **Server DB** — Neon in production, PGlite-Node for local dev. Accessed from route handlers via `ctx.db`.
- **Client DB** — PGlite in the browser (IndexedDB-backed). Accessed from client components via `useLocalDb()`.

Both use **Drizzle ORM**. The swap point is the driver factory — routes and hooks don't change when you swap the underlying driver.

## Architecture

```
┌─ Route handler ──────────────────────────────────────────────┐
│  handler: async ({ db, log }) => db.posts.list()             │  ← ctx.db
└──────────────────────────────────────────────────────────────┘
                               ▲
┌─ Client component ───────────┴───────────────────────────────┐
│  const db = useLocalDb(); await db.notes.list();             │  ← useLocalDb()
└──────────────────────────────────────────────────────────────┘
                               ▲
┌─ Repository layer (per tier) ┴───────────────────────────────┐
│  src/db/server/repositories/*  (Neon / PGlite-Node)          │
│  src/db/client/repositories/*  (browser PGlite)              │
└──────────────────────────────────────────────────────────────┘
                               ▲
┌─ Drizzle + schema (shared)  ─┴───────────────────────────────┐
│  src/db/schema/*  ← pgTable definitions, inferred types      │
└──────────────────────────────────────────────────────────────┘
```

## File layout

```
src/db/
├── schema/                        # shared — imported by both tiers
│   ├── index.ts                   # barrel
│   ├── posts.ts                   # server-side table
│   └── notes.ts                   # client-side table
├── server/
│   ├── index.ts                   # Database type, getDatabase() singleton
│   ├── driver.ts                  # Neon | PGlite-Node selection
│   ├── migrate.ts                 # `yarn db:migrate`
│   ├── testing.ts                 # createTestDatabase() helper
│   └── repositories/
│       ├── posts.ts               # postsRepo(drizzle) → { list, findById, create, removeOwned }
│       └── posts.test.ts
├── client/
│   ├── index.ts                   # LocalDatabase type, getLocalDatabase() singleton
│   ├── hook.ts                    # useLocalDb() React hook
│   ├── init.ts                    # ensureClientSchema() — CREATE TABLE IF NOT EXISTS
│   └── repositories/
│       ├── notes.ts               # notesClientRepo(drizzle) → { list, create, remove }
│       └── notes.test.ts
└── migrations/
    └── server/                    # drizzle-kit output (server side only)
```

## Env vars

| Var              | Values                    | Default                         | Notes                                                     |
|------------------|---------------------------|---------------------------------|-----------------------------------------------------------|
| `DATABASE_URL`   | Neon connection string    | unset                           | Auto-injected by Vercel Storage → Neon. Goes in `.env.local` for secrets. |
| `DATABASE_MODE`  | `auto \| neon \| pglite`  | `auto`                          | `auto`: Neon if `DATABASE_URL` set, else PGlite-Node      |
| `PGLITE_DATA_DIR`| path                      | `./.data/pglite`                | Where PGlite-Node persists. Gitignored.                    |

Production (no `DATABASE_URL` in `auto` mode) → error. You must either set `DATABASE_URL` or explicitly opt into `DATABASE_MODE=pglite`.

## The 8 rules (D1–D8)

### D1. Schema is shared across tiers
Tables live in `src/db/schema/<name>.ts`. Both server and client repos import from the same schema file. The schema file has no runtime coupling to either driver.

### D2. Types re-export from schema via `src/types/<domain>.ts` (type-only)
Client components must not reach into `@/db/schema/*` at runtime (would pull Drizzle into the client bundle for pages that don't need it). Instead:

```ts
// src/types/post.ts
export type { Post, NewPost } from '@/db/schema/posts';  // type-only erasure
```

Same R1/R9 rules apply — types in `src/types/`, routes reference from there.

### D3. Every repo ships with a test
Server repos: `src/db/server/repositories/<name>.test.ts` — uses `createTestDatabase()` (in-memory PGlite + real migrations). Client repos: `src/db/client/repositories/<name>.test.ts` — uses a vanilla PGlite instance + `ensureClientSchema()`. Per R12.

### D4. Routes access data via `ctx.db.<repo>.<method>` — never raw Drizzle
Handlers call `db.posts.list()`, not `db.$drizzle.select().from(posts)`. Keeps the swap-the-driver promise honest and concentrates query logic in repos where it's testable in isolation.

(An escape hatch exists: `ctx.db.$drizzle` is the raw Drizzle client. Use only when a query genuinely doesn't fit a repo method, and add that method afterward.)

### D5. Server migrations are file-based; client migrations are programmatic
- Server: `yarn db:generate` writes SQL files to `src/db/migrations/server/`. Apply with `yarn db:migrate` (dev) or in your Vercel build step. Never edit generated SQL by hand.
- Client: no migration files. `ensureClientSchema()` in `src/db/client/init.ts` runs `CREATE TABLE IF NOT EXISTS` on first query. Idempotent, per-user isolated.

### D6. `DATABASE_URL` lives in `.env.local`, never in `.env`
It's a secret. `.env` ships committed defaults; `.env.local` is gitignored.

### D7. Route tests inject a test db; repo tests use real PGlite
```ts
// route test
const { db, reset, close } = await createTestDatabase();
await callRoute(['posts', 'list'], { db });

// repo test — same helper
```
Unit-test-speed route tests (no real SQL) are still an option: construct a `fakeDb = {} as Database` and mock the specific repo methods with `vi.fn()`. Reach for real-SQL testing unless the test is truly about handler logic in isolation.

### D8. Schema changes and their migration file ship in the same commit
Add a column → `yarn db:generate` → commit both the schema and the new `0001_*.sql`. Reviewing one without the other hides the real change.

## Adding a new table (end-to-end)

### 1. Schema
```ts
// src/db/schema/widgets.ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const widgets = pgTable('widgets', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  ownerId: text('owner_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Widget = typeof widgets.$inferSelect;
export type NewWidget = typeof widgets.$inferInsert;
```

### 2. Type re-export + Zod
```ts
// src/types/widget.ts
import { z } from 'zod';
export type { Widget, NewWidget } from '@/db/schema/widgets';

export const createWidgetInputSchema = z.object({
  label: z.string().min(1).max(200),
});
export type CreateWidgetInput = z.infer<typeof createWidgetInputSchema>;
```

### 3. Repository
```ts
// src/db/server/repositories/widgets.ts
import { eq } from 'drizzle-orm';
import { widgets } from '@/db/schema/widgets';
import type { Widget } from '@/types/widget';
import type { ServerDrizzle } from '../driver';

export function widgetsRepo(db: ServerDrizzle) {
  return {
    list: async (): Promise<Widget[]> => db.select().from(widgets),
    findById: async (id: string) =>
      (await db.select().from(widgets).where(eq(widgets.id, id)).limit(1))[0] ?? null,
  };
}
export type WidgetsRepo = ReturnType<typeof widgetsRepo>;
```

### 4. Register in Database
```ts
// src/db/server/index.ts
export type Database = {
  posts: PostsRepo;
  widgets: WidgetsRepo;   // added
  $drizzle: ServerDrizzle;
};

export function createDatabase(drizzle: ServerDrizzle): Database {
  return {
    posts: postsRepo(drizzle),
    widgets: widgetsRepo(drizzle),
    $drizzle: drizzle,
  };
}
```

### 5. Migration
```bash
yarn db:generate         # writes src/db/migrations/server/0001_*.sql
yarn db:migrate          # applies to local DB
```

### 6. Test the repo
```ts
// src/db/server/repositories/widgets.test.ts
// (same pattern as posts.test.ts — createTestDatabase, beforeEach reset)
```

### 7. Wire into a route
```ts
// src/server/routes/widgets/index.ts
const list = defineRoute<void, Widget[]>({
  handler: ({ db }) => db.widgets.list(),
});
export const widgets = defineNamespace({ routes: { list } });
```

Register in `src/server/router.ts`.

### 8. Commit
One logical unit — schema, types, repo, repo test, migration, route, route test — all together.

## Adding a client-side-only table

Same steps but under `src/db/client/`:

1. Schema in `src/db/schema/<name>.ts` (can live alongside server tables)
2. Extend `ensureClientSchema()` in `src/db/client/init.ts` with a `CREATE TABLE IF NOT EXISTS` statement
3. `src/db/client/repositories/<name>.ts`
4. Add to `LocalDatabase` type + `getLocalDatabase()` factory in `src/db/client/index.ts`
5. Test in `src/db/client/repositories/<name>.test.ts`
6. Consume via `const db = useLocalDb(); await db.<name>.list();`

No migrations. No server setup.

## Vercel setup

1. Deploy the project to Vercel (first push).
2. In the dashboard → your project → **Storage** tab → **Create Database** → **Neon**.
3. Vercel injects `DATABASE_URL` (and Neon-specific vars) into all environments.
4. In your deploy pipeline (or manually after first deploy): run `yarn db:migrate` to apply schema.
5. That's it — `DATABASE_MODE=auto` picks up the URL and switches to Neon. No code changes.

Neon's HTTP driver is used (`@neondatabase/serverless` + `drizzle-orm/neon-http`) — no connection pooling, one HTTP call per query. Optimal for Vercel function ephemerality.

## LLM checklist

- [ ] Is every table in `src/db/schema/<name>.ts`?
- [ ] Are types re-exported from `src/types/<domain>.ts` as `export type { … }`?
- [ ] Does every repo have a co-located test (D3/R12)?
- [ ] Did you run `yarn db:generate` after a schema change and commit the migration (D8)?
- [ ] Does every route access data via `ctx.db.<repo>.<method>` — not raw `$drizzle`?
- [ ] Is `DATABASE_URL` in `.env.local`, not `.env`?
