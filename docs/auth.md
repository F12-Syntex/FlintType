# Authentication

Clerk is the auth provider. This doc is the authoritative guide for anything auth-related.

## What ships

- `@clerk/nextjs` installed.
- `src/proxy.ts` runs `clerkMiddleware()` on every request except static asset paths.
- `src/app/layout.tsx` wraps the app in `<ClerkProvider>` and renders a sticky header with Clerk's `<SignInButton>` / `<SignUpButton>` / `<UserButton>`, gated by `<Show when="signed-out|signed-in">`.
- `src/server/middleware/auth.ts` — `requireAuth` and `requireAdmin` middleware that read Clerk's session via `auth()` from `@clerk/nextjs/server`.
- **Keyless mode** — the boilerplate works out of the box without any Clerk env vars. Clerk auto-generates temporary keys, and a "Configure your application" prompt appears in the UI where you can claim the instance when ready.

## Auth middleware

### `requireAuth` (signed-in gate)

Reads `auth()` from Clerk. On success, exposes:
- `ctx.meta.userId` — Clerk's `user_...` id.
- `ctx.meta.sessionClaims` — the decoded session JWT claims (unknown shape — cast when you read).

Throws `BackendError(401, 'UNAUTHORIZED')` if no session.

### `requireAdmin` (role gate)

Must run **after** `requireAuth`. Reads `ctx.meta.sessionClaims.metadata.role` and requires the literal `'admin'`. Throws:
- `BackendError(500, 'INTERNAL')` — if `requireAuth` didn't populate `ctx.meta.userId` (programmer error).
- `BackendError(403, 'FORBIDDEN')` — if the role isn't `'admin'`.

### `requireAdminOrDev` (dev-open admin gate)

Same shape as `requireAdmin` in production, but lets every caller through when `env.APP_ENV === 'development'` **and** the process is not running on a hosted deploy. Used by the `admin` namespace (`/admin/database/*`) so local inspection works without a Clerk session and without granting a local user the admin role.

- local dev (`APP_ENV=development`, no `VERCEL=1` / `CI=true`) — pass through unconditionally. Copies `userId` / `sessionClaims` onto `ctx.meta` **if** Clerk returns them, silently skips when Clerk isn't configured.
- anything else, including any hosted deploy regardless of `APP_ENV` — require a signed-in user whose session claims carry `metadata.role === 'admin'`. Throws `UNAUTHORIZED` (no session) or `FORBIDDEN` (non-admin).

**Hosted-deploy guard.** `src/server/env.ts` refuses to boot with `APP_ENV=development` when `VERCEL=1` or `CI=true`. `requireAdminOrDev` also checks those two vars at runtime — so a misconfigured or mocked env cannot silently open up admin surfaces in a production deploy. Both layers are deliberate: env.ts catches misconfiguration at boot, the middleware is belt-and-braces at request time.

Reach for this **only** for admin surfaces that must be usable locally during development. Anything that should stay locked in dev too uses the strict `[requireAuth, requireAdmin]` pair.

### Setting roles in Clerk

Two steps in the Clerk dashboard:

1. **Set the role on a user.** User → Metadata tab → **Public metadata** → add `{ "role": "admin" }`. Public metadata is safe to send to the client.
2. **Expose `metadata` as a session claim.** Dashboard → Sessions → **Customize session token** → add `"metadata": "{{user.public_metadata}}"` to the JWT template. Without this step `ctx.meta.sessionClaims.metadata` is undefined.

Alternatively use Clerk's [organization roles](https://clerk.com/docs/guides/organizations/overview) — substitute `ctx.meta.sessionClaims.org_role === 'org:admin'` in `requireAdmin`.

## Adding a protected route

Three shapes, all under existing backend rules:

```ts
// one method is admin-only inside an otherwise-auth'd namespace
const deleteOne = defineRoute<DeleteInput, void>({
  input: deleteInputSchema,
  middleware: [requireAdmin],
  handler: ({ input }) => {...},
});
```

```ts
// a cluster of admin routes — nest a namespace
export const admins = defineNamespace({
  middleware: [requireAdmin],
  routes: { list, invite, remove },
});
```

```ts
// entire feature area is admin-only
export const billing = defineNamespace({
  middleware: [requireAuth, requireAdmin],
  routes: { ... },
});
```

Always order `[requireAuth, requireAdmin]` — `requireAdmin` reads what `requireAuth` writes.

## Accessing the current user inside a handler

```ts
import { currentUser } from '@clerk/nextjs/server';

const me = defineRoute<void, UserProfile>({
  middleware: [requireAuth],
  handler: async ({ meta }) => {
    const clerk = await currentUser();
    if (!clerk) throw new BackendError(401, 'UNAUTHORIZED', 'no user');
    return {
      id: meta.userId as string,
      email: clerk.emailAddresses[0]?.emailAddress ?? '',
      name: `${clerk.firstName ?? ''} ${clerk.lastName ?? ''}`.trim(),
    };
  },
});
```

`currentUser()` fetches from Clerk's API and is server-only. For tight loops, prefer reading `ctx.meta.userId` and `sessionClaims` — they come from the already-decoded session JWT and are free.

## Querying the user directory

The shipping `users` namespace queries Clerk directly via `clerkClient` rather than a local DB:

```ts
// src/server/routes/users/index.ts
import { clerkClient } from '@clerk/nextjs/server';
import { toUser } from '@/server/clerk-user';

const list = defineRoute<void, ListUsersOutput>({
  handler: async () => {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({ limit: 100 });
    return data.map(toUser);
  },
});
```

`toUser` (`src/server/clerk-user.ts`) is the canonical mapper from Clerk's user shape to our internal `User` type (`src/types/user.ts`). It picks the primary email, builds a display name (first+last, falling back to email, falling back to the Clerk id), and reads `publicMetadata.role` for the role.

**Rules for calling Clerk's API from handlers:**
- Always go through `clerkClient()` (async). Never import from `@clerk/backend` directly or try to construct a client yourself.
- Always map via `toUser` before returning. Clerk's shape is not a public API of this backend.
- Throw `BackendError(404, 'NOT_FOUND', ...)` when a lookup fails. Never let Clerk errors surface raw.

## Local `users` mirror — `ensureUser(ctx)`

Clerk owns identity; the local `users` table mirrors the fields we need for
relational work (FKs from `posts.authorId`, joins, cascade deletes).
`src/server/ensure-user.ts` is the one helper that keeps the mirror honest:

```ts
const me = await ensureUser(ctx);  // UserRow, guaranteed to exist
```

Flow: read `ctx.meta.userId` → `ctx.db.users.findById` → on miss, fetch from
Clerk via `clerkClient()` and `ctx.db.users.upsertFromClerk`. One indexed
`SELECT` per authenticated request in steady state; one Clerk API call per
user, ever, on first authenticated access.

Handlers that need the local row call `ensureUser(ctx)` explicitly — it's not
wired into `requireAuth` to keep the middleware free of extra work for routes
that don't need the mirror.

### When to reach for `ensureUser` vs Clerk directly

- **Need a local FK, a SQL join, or cascade-delete semantics** → `ensureUser`
  (and your handler reads from `ctx.db.users`).
- **Need a pure read of Clerk-owned data** (email, imageUrl, metadata you
  don't mirror) → `clerkClient.users.getUser(id)` with `toUser`, as in
  `src/server/routes/users/`. No mirror row needed.

### Staleness

Without a webhook, email / name / role updates in Clerk don't flow to the
mirror until the user triggers another `upsertFromClerk` path (a route that
calls `ensureUser` on a stranger → that user logging in → an explicit sync).
Deletes leak orphaned rows. Both are acceptable for most boilerplate uses;
wire up the Clerk webhook (Phase 2) the moment you need fresh updates or
reliable deletion.

## Client-side auth UI

The root layout exposes:
- `<Show when="signed-out">` — renders children only when no session.
- `<Show when="signed-in">` — renders children only when signed in.
- Header links to `/sign-in` and `/sign-up` (via `next/link` + `buttonVariants`), gated by `<Show when="signed-out">`.
- `<UserButton />` — avatar with profile / sign-out.

**Never** use the deprecated `<SignedIn>` / `<SignedOut>` components — Clerk's current API is `<Show when="...">`.

**Never** use `authMiddleware()` — replaced by `clerkMiddleware()`.

## Dedicated sign-in / sign-up / forgot-password pages

Two catch-all routes render Clerk's `<SignIn />` and `<SignUp />` components, which ship with every flow bundled — email + password, social providers enabled in the dashboard, email verification, and **forgot password** (link inside `<SignIn />` → code-to-email → reset). No extra pages needed.

| Path                               | Component    | Purpose                                                        |
|------------------------------------|--------------|----------------------------------------------------------------|
| `src/app/sign-in/[[...sign-in]]/page.tsx` | `<SignIn />` | Sign in + forgot-password + social providers                  |
| `src/app/sign-up/[[...sign-up]]/page.tsx` | `<SignUp />` | Create account + email verification + social providers        |

Both pages declare `noIndex: true` via `buildPageMetadata` (S8 — auth surfaces stay out of search).

The catch-all `[[...sign-in]]` segment is required — Clerk routes its internal steps (e.g. `/sign-in/factor-one`, `/sign-in/reset-password`) through the same page.

`.env` wires Clerk's internal redirects to these routes:

```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

Without those, `<UserButton />` sign-out and other Clerk components would fall back to Clerk's hosted accounts portal instead of our pages.

## Testing protected routes

`auth()` and `clerkClient()` cannot run outside a Clerk-aware request context, so tests mock both at the module boundary:

```ts
import { beforeEach, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  clerkClient: vi.fn(),
}));

import { auth, clerkClient } from '@clerk/nextjs/server';

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);

function mockClerkUsers(users: ClerkUserLike[]) {
  mockClerkClient.mockResolvedValue({
    users: {
      getUserList: vi.fn(async () => ({ data: users, totalCount: users.length })),
      getUser: vi.fn(async (id: string) => {
        const found = users.find((u) => u.id === id);
        if (!found) throw new Error('Not Found');
        return found;
      }),
    },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockClerkClient.mockReset();
});

it('lists users when authenticated', async () => {
  mockAuth.mockResolvedValue({
    userId: 'user_2',
    sessionClaims: { metadata: { role: 'user' } },
  } as unknown as Awaited<ReturnType<typeof auth>>);
  mockClerkUsers([fixture({ id: 'user_1' })]);
  const users = await callRoute<ListUsersOutput>(['users', 'list']);
  expect(users.length).toBeGreaterThan(0);
});
```

Tests that don't hit the users namespace only need the `auth` mock; the `clerkClient` mock is only required by tests that reach route handlers which call it. The `beforeEach` reset ensures every test starts from a clean slate.

Live examples: `src/server/middleware/auth.test.ts`, `src/server/clerk-user.test.ts`, `src/server/routes/users/index.test.ts`, `src/server/routes/users/admins/index.test.ts`, `src/app/api/[...path]/route.test.ts`.

## Env vars

`.env.local` (gitignored — where secrets go) when you claim your Clerk instance:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Without these, keyless mode auto-generates temporary keys at runtime. Good for local dev; production deploys must set real keys.

## Rules

### A1. `requireAuth` is a namespace/route middleware, never inline
Apply via `defineNamespace({ middleware: [requireAuth] })` or `defineRoute({ middleware: [requireAuth] })`. Never call `auth()` from inside a handler to conditionally reject — that scatters auth logic.

### A2. `requireAdmin` always follows `requireAuth`
Order matters. `requireAdmin` reads `ctx.meta.sessionClaims` which `requireAuth` sets.

### A3. Tests mock `@clerk/nextjs/server`
Auth middleware tests and any route test whose namespace has auth middleware attached uses the `vi.mock` pattern above. Without the mock, `auth()` returns `null` everywhere (effectively unauthenticated).

### A4. Never log, persist, or ship claims that may contain PII
Session claims are JWT payload. Treat them like bearer tokens — don't write them to logs, don't persist them, don't return them from routes. Log the `userId` only.

### A5. Keyless mode is a dev convenience, not a production pattern
Production deploys set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` via `.env.local` or the deploy platform's secret store.

### A6. `ensureUser` is the only supported way to materialise a local users row
Handlers don't hand-write `clerkClient + upsertFromClerk`. They call
`ensureUser(ctx)` (after `requireAuth`). One code path = one place to change
when the webhook lands and we can skip the fallback Clerk call.

### A7. `requireAdminOrDev` is only for dev-inspection admin surfaces
The `/admin/*` namespace uses `requireAdminOrDev` because the boilerplate wants the database explorer to work locally without Clerk configured. If you add an admin route whose payload is sensitive even in dev (sends email, charges a card, rotates a secret), gate it with the strict `[requireAuth, requireAdmin]` pair instead — no dev bypass.
