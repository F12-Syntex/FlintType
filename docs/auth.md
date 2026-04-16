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

## Client-side auth UI

The root layout exposes:
- `<Show when="signed-out">` — renders children only when no session.
- `<Show when="signed-in">` — renders children only when signed in.
- `<SignInButton mode="modal">` / `<SignUpButton mode="modal">` — open Clerk's hosted modals (no custom pages needed).
- `<UserButton />` — avatar with profile / sign-out.

**Never** use the deprecated `<SignedIn>` / `<SignedOut>` components — Clerk's current API is `<Show when="...">`.

**Never** use `authMiddleware()` — replaced by `clerkMiddleware()`.

## Testing protected routes

`auth()` cannot run outside a Clerk-aware request context, so tests mock it at the module boundary:

```ts
import { beforeEach, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

import { auth } from '@clerk/nextjs/server';
const mockAuth = vi.mocked(auth);

beforeEach(() => {
  mockAuth.mockReset();
});

it('lists users when authenticated', async () => {
  mockAuth.mockResolvedValue({
    userId: 'user_2',
    sessionClaims: { metadata: { role: 'user' } },
  } as unknown as Awaited<ReturnType<typeof auth>>);
  const users = await callRoute<ListUsersOutput>(['users', 'list']);
  expect(users.length).toBeGreaterThan(0);
});
```

Live examples: `src/server/middleware/auth.test.ts`, `src/server/routes/users/index.test.ts`, `src/app/api/[...path]/route.test.ts`.

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
