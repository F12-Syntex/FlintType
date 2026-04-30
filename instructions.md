# Instructions — cloning flinttype

Start-to-finish setup for a new project built on flinttype's scaffolding base. Everything else (rules, patterns, deep docs) lives under `docs/`.

## What's in the box

| Feature | Status | Opt-in? | Doc |
|---|---|---|---|
| Next.js 16 App Router + React 19 | Always on | — | `README.md` |
| Tailwind v4 + shadcn (base-nova, zinc palette) | Always on | — | `docs/ui-law.md` |
| Typed backend (router tree, Zod, cascading middleware) | Always on | — | `docs/backend-rules.md` |
| Structured logger (`ctx.log`) | Always on | — | `docs/backend-rules.md` |
| Clerk auth (keyless by default) | Ships wired | Remove if unused | `docs/auth.md` |
| Server DB (Neon in prod / PGlite-Node in dev) | Ships with posts demo | Per table | `docs/database.md` |
| Client DB (browser PGlite, OPFS/IDB) | Ships with notes demo | Per component | `docs/database.md` |
| SEO (metadata, sitemap, robots, llms.txt) | Always on | — | `docs/seo.md` |
| Unit tests (Vitest) | Always on | — | `docs/backend-rules.md` R12 |
| `/quality-report` slash command | Always on | — | `.claude/commands/quality-report.md` |

## First time — clone to running app in 5 minutes

```bash
git clone <your fork> my-new-app
cd my-new-app
yarn install
yarn dev
```

Open `http://localhost:3000`. You'll see:
- A top header with **Sign in** / **Sign up** buttons (Clerk, keyless mode).
- The backend demo (health, echo, users via Clerk).
- The local notes demo (browser PGlite).

**No env vars are required to run this.** Clerk runs keyless; the database falls back to PGlite. It just works.

## Per-project checklist

### 1. Always — branding + site config

Open `src/server/seo.ts`:

```ts
export const siteConfig = {
  name: 'your-app-name',             // ← change
  description: 'One-liner, 120–160 chars.',  // ← change
  url: env.SITE_URL,
  locale: 'en_US',
};
```

Update `public/llms.txt` with your app's name and an intro blockquote. The same text can live in `README.md`.

### 2. Claim your Clerk instance (when using auth)

The first time you sign up in the app, Clerk shows a "Configure your application" callout. Click it. Clerk walks you through creating a real account and gives you:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Put them in `.env.local` (gitignored). Restart dev. Keyless mode transitions to claimed mode seamlessly.

If your project doesn't need auth at all, remove the `<ClerkProvider>` wrapper in `src/app/layout.tsx`, delete the `Show`/`SignInButton`/`SignUpButton`/`UserButton` usage, and drop `src/proxy.ts`. Middleware tests and the `requireAuth`/`requireAdmin` helpers can also be deleted.

### 3. Decide your database tier

Three questions, in order:

> 1. Does the data need to be shared across users or devices? → **Server DB (tier A)**
> 2. Else, does it need to persist across browser sessions? → **Client DB (tier B)**
> 3. Else → just `useState` or localStorage — no DB at all.

You can mix per-table (see `docs/database.md`).

#### 3a. Server DB — hooking up Neon via Vercel

1. Push your project to Vercel.
2. Dashboard → your project → **Storage** → **Create Database** → **Neon**.
3. Vercel auto-injects `DATABASE_URL` into every environment.
4. In your deploy pipeline (or once manually): `yarn db:migrate` to apply migrations.
5. Locally: optionally add your own `DATABASE_URL=...` to `.env.local` to hit a Neon dev branch. Otherwise leave it unset — `DATABASE_MODE=auto` falls back to PGlite-Node and your data persists in `./.data/pglite/`.

#### 3b. Client DB — nothing to configure

Just use `useLocalDb()` in your component. PGlite loads on demand; data persists in the user's IndexedDB.

#### 3c. No DB — drop the scaffolding

- Don't import anything from `@/db/*` — it won't ship to the bundle.
- You can delete `src/db/`, `drizzle.config.ts`, the posts demo, and the `db:*` scripts in `package.json` if you want zero weight.

### 4. Build your first page

```tsx
// src/app/<route>/page.tsx
import { buildPageMetadata } from '@/server/seo';

export const metadata = buildPageMetadata({
  title: 'Page Title',
  description: 'A 120–160 character description.',
  path: '/<route>',
});

export default function Page() {
  return <main className="mx-auto flex max-w-3xl flex-col gap-10 px-8 py-20">…</main>;
}
```

Also:
- Append the route to `src/app/sitemap.ts` and `public/llms.txt` in the same commit (see `docs/seo.md` S7).
- Reuse Tailwind classes from `docs/ui-law.md` §§2–5 — amend the doc before adding new ones.

### 5. Deploy

```bash
git push        # -> Vercel auto-deploys
```

Checklist before production:
- [ ] `SITE_URL` set in Vercel env to real host (e.g. `https://yourapp.com`).
- [ ] Real `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` set (if using auth).
- [ ] Neon DB provisioned via Vercel Storage (if using server DB).
- [ ] `yarn db:migrate` in deploy pipeline (once migrations exist).
- [ ] `yarn test` green.
- [ ] `yarn lint` clean.
- [ ] `yarn build` succeeds locally.

## Common commands

```bash
yarn dev              # dev server on :3000
yarn build            # production build
yarn start            # run the production build locally
yarn lint             # eslint
yarn test             # vitest run
yarn test:watch       # vitest watch mode
yarn db:generate      # diff schema -> write migration SQL
yarn db:migrate       # apply pending migrations
yarn db:push          # dev only: push schema directly without a migration file
yarn db:studio        # drizzle-kit studio (browse your db)
```

## Adding things — quick reference

| To add a… | Start here | Doc |
|---|---|---|
| New page | `src/app/<route>/page.tsx` (+ metadata) | `docs/seo.md` |
| New shared component | `src/components/<name>.tsx` | `docs/ui-law.md` §1 |
| New shadcn primitive | `yarn shadcn add <name>` | — |
| New backend route | See "How to add a method" | `docs/backend-rules.md` |
| New domain types + Zod schemas | `src/types/<domain>.ts` | R1 |
| New middleware | `src/server/middleware/<name>.ts` | R6 |
| New DB table (server) | schema → types → repo → migration → register | `docs/database.md` §8 |
| New DB table (client only) | schema → extend `ensureClientSchema` → repo → register | `docs/database.md` |
| New error code | `src/lib/errors.ts` `ErrorCode` union | R7 |
| New async UI pattern | `useAsyncAction()` from `@/lib/use-async-action` | `docs/ui-law.md` §8 |

## Environment variables — what goes where

### `.env` (committed, no secrets)
```
APP_ENV=development
LOG_ENABLED=true
LOG_LEVEL=debug
SITE_URL=http://localhost:3000
DATABASE_MODE=auto
PGLITE_DATA_DIR=./.data/pglite
```

### `.env.local` (gitignored — secrets go here)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgres://...    # if you want a local Neon branch
```

### Vercel (production)
Set in Vercel dashboard → Settings → Environment Variables. `DATABASE_URL` is auto-injected by the Neon integration; the Clerk keys and `SITE_URL` you add manually.

## Governance — the living docs

Before writing new code, the relevant doc is the source of truth:

| Doing… | Consult |
|---|---|
| Anything backend | `docs/backend-rules.md` (R1–R12) |
| Anything frontend / UI | `docs/ui-law.md` (meta-rule: amend before using new classes) |
| Deciding where a new file goes | `docs/organization.md` (length thresholds + decision table) |
| Pages / SEO | `docs/seo.md` (S1–S9) |
| Auth | `docs/auth.md` (A1–A5) |
| Database | `docs/database.md` (D1–D8) |

All six are auto-loaded into Claude Code's context via `CLAUDE.md` — just invoke Claude inside the repo and it knows them.

## When you get stuck

- Run `/quality-report` in Claude Code — gives an objective audit of test state, rule violations, file sizes, missing coverage.
- Read the referenced doc. The rules cover ~95% of decision points.
- Check `src/server/routes/posts/` for a live end-to-end example (auth + validation + DB + tests).
- Check `src/app/_components/local-notes-inner.tsx` for a live client-DB example.

## One-paragraph mental model

This boilerplate gives you a typed server tree (`src/server/routes/`) accessed by clients through a Proxy (`useBackend()`), protected per-namespace by cascading middleware (auth, logging, anything you add), sitting on top of Drizzle + Neon for server data and Drizzle + browser PGlite for local data — all with Zod at the wire edges, structured request-scoped logging, and Clerk for identity. UI conventions are codified in a living document you amend alongside every pattern you introduce. Most of it is opt-in — if you don't import it, it doesn't ship.
