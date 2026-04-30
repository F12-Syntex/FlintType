# Depth Review — `flinttype` @ v0.20.0

**Scope.** Full-repository audit. Every `src/**/*.ts(x)` non-test module read, every route handler inspected, every middleware walked, every domain doc (`docs/*.md`) cross-referenced against the implementation. Green-field evaluation — rules treated as the contract, code treated as the claim against that contract.

**Harness signal.**

| Check           | Result                                  |
|-----------------|-----------------------------------------|
| `yarn test`     | **239 / 239 passed** across 36 test files, 2.99 s |
| `npx tsc --noEmit` | **clean** (no errors)                |
| `yarn lint`     | **clean** (0 errors, 0 warnings)        |
| `git status`    | 3 untracked files, all under `prompts/` (user scratchpad, not code) |
| Top commit      | `e4a170c feat(app): landing page + /app user home with auth redirect` |
| Commit discipline | 66 commits, Conventional Commits format, **no Claude watermark on any** |

Status: the project is shippable against its own rulebook. The gap between rule and reality is narrow, and the violations that exist are almost all stylistic or cosmetic, not structural.

---

## Methodology

Before scoring I re-read the authoritative rulebooks:

- `docs/backend-rules.md` — 12 rules, coverage matrix, antipatterns table
- `docs/ui-law.md` — meta-rule, §§2–5 palette/spacing/typography/layout, §10 mobile-first
- `docs/organization.md` — length thresholds, decision table
- `docs/seo.md` — S1–S9, per-page template
- `docs/auth.md`, `docs/database.md`, `docs/ai.md`, `docs/payments.md` — domain rules

I then derived **10 evaluation categories** from those rulebooks plus standard software-engineering hygiene, read every production source file, and graded each category 0–10 with evidence.

The rubric rewards:

1. **Does the code satisfy its own stated rule?** Not "is the rule reasonable" — that's a different conversation.
2. **Is the evidence reproducible?** Every deduction below points at a file and a line; every claim of correctness points at a file that demonstrates it.

No marks given for vibes, intent, or potential. Only for what is in the tree at v0.20.0.

---

## The 10 Categories

### 1. Architecture & Design Philosophy — **9 / 10**

**Thesis.** The boilerplate is organized around one good idea: a typed route tree at `src/server/router.ts` consumed by a recursive `Proxy` on the client. Property access is type-traversal, invocation is HTTP — no codegen, no duplication, no runtime registry to keep in sync.

**Evidence.**

- `src/server/pipeline.ts:28–44` — the onion dispatcher is 17 lines; middleware composition is a naive integer index walk, which is the right shape for this scale.
- `src/server/resolve.ts` — 32 lines, pure, no branching other than "is this a route or a namespace". The test file (`resolve.test.ts`) exercises every branch.
- `src/lib/backend.ts:7–16` — the `Client<T>` conditional type erases on compile; at runtime the Proxy is 10 lines (`createClient` at L48–57) and stateless.
- `src/server/defineRoute.ts` + `src/server/defineNamespace.ts` — 12 and 10 lines respectively. The entire DSL is four primitives: `defineRoute`, `defineNamespace`, `BackendError`, `Middleware`.
- `src/app/api/[...path]/route.ts` — the dispatcher is 76 lines and covers: routing, JSON body parse, ZodError mapping, BackendError pass-through, unknown-throw fallback. Single-responsibility.

**Deductions.**

- `src/lib/backend.ts:61–63` — `useBackend()` is named as a React hook but returns a module-scoped, reference-stable Proxy with no hook dependencies. It obeys no hook rules because there aren't any to obey. That's fine, but a name like `getBackend()` would avoid a reader's future confusion.
- `ctx.meta` is typed `Record<string, unknown>` (pipeline.ts:19), which forces every read to cast (`sessionClaims as SessionClaimsWithRole`). Pragmatic, but a `declare module` augmentation slot for known keys would be cleaner — middleware could merge in `{ userId: string; sessionClaims: …; requestId: string }` without casts.

### 2. Type Safety & Contract Discipline — **9 / 10**

**Thesis.** End-to-end types derived from the route tree, not maintained in parallel. Zod at the wire; TypeScript everywhere else.

**Evidence.**

- **R1 — types in `src/types/<domain>.ts`:** every `defineRoute<I, O>` in `src/server/routes/**/*.ts` names both generics and imports from `@/types/*`. Verified by `grep` of all 13 `defineRoute<…>` call sites.
- **R2 — explicit generics:** zero violations. No `defineRoute({ handler })` without generics exists in the tree.
- **R4 — Zod at the boundary:** every route whose input crosses the wire declares an `input:` schema. Verified on `echo.say`, `users.get`, `posts.create`, `posts.remove`, `ai.chat`, `admin.database.rows`.
- The `Client<T>` type in `src/lib/backend.ts:7–14` is a conditional type that recurses over the router shape — one source of truth, no client/server drift possible.
- `any` is fenced: the only two in the repo are `AnyRouteDef` / `AnyNamespaceDef` in `src/server/types.ts:31–32`, wrapped in an `eslint-disable`. These are legitimate — you cannot erase generic parameters and keep the tree walkable.

**Deductions.**

- `src/db/schema/server/index.ts` and `.../client/index.ts` are barrel re-exports (`export * from './posts';`). Allowed by organization.md as documented exceptions, but barrel imports route through both files at compile time. Not a violation, called out for completeness.
- Handler inputs typed as `void` (e.g. `health.ping`, `posts.list`) rely on TypeScript's `void`-unaware conditional at `backend.ts:8-10` which correctly turns that into a no-arg call shape. Verified via the client type signature showing `() => Promise<O>` for those routes. Clean.

### 3. Backend Rules Compliance (R1–R12) — **9 / 10**

**Thesis.** 12 numbered rules, and the code keeps all of them — with one literal raw-`Error` throw in a repo.

**Evidence — per rule.**

| Rule | Status | Evidence |
|------|--------|----------|
| R1 types centralized | ✅ | All route I/O types live in `src/types/*.ts`. |
| R2 explicit generics | ✅ | All 13 `defineRoute<I,O>` call sites. |
| R3 typed output | ✅ | Every O is a named import from `@/types/*`. |
| R4 Zod on input | ✅ | No hand-written `validate` functions anywhere. |
| R5 no runtime response validation | ✅ | None found. |
| R6 middleware at right level | ✅ | `logging` is root-level (router.ts:13), `requireAuth` / `rateLimit` are namespace-level, per-route middleware is used for tighter limits. |
| R7 BackendError-only throws | ✅ (with 1 nit) | See deduction. |
| R8 every route has a test | ✅ | All 13 routes have co-located `*.test.ts` covering happy/validation/auth/domain paths. |
| R9 no `@/server/*` in client components | ✅ | Only server components (pages) import `@/server/seo`; verified `use client` components never do. |
| R10 `setBackendHeaders` for non-auth headers | ✅ | Infrastructure in `src/lib/backend.ts:21–23`; documented correctly. |
| R11 routes as top-level consts | ✅ | No inline `defineRoute` inside `defineNamespace.routes`. Verified by grep. |
| R12 every backend module has a test | ✅ (with 1 nit) | 25 test files under `src/server/**` + `src/db/**` + `src/lib/**`. Coverage matches the matrix. |

**Deductions.**

- `src/db/server/repositories/users.ts:42` — `throw new Error('users.upsertFromClerk returned no rows');` — a raw `Error` in a repo rather than a `BackendError(500, 'INTERNAL', …)`. The dispatcher still maps this to `INTERNAL 500`, so the wire contract is intact, but it violates the spirit of R7 and is inconsistent with `src/db/server/repositories/posts.ts:44–47` which does throw `BackendError` for the identical no-rows case.
- `src/server/defineRoute.ts` (12 lines) and `src/server/defineNamespace.ts` (10 lines) have no co-located `*.test.ts`. They are pure factories covered transitively by `pipeline.test.ts` + `resolve.test.ts`, so the R12 exclusion clause ("Type-only files — the compiler is the test") nearly applies. The rule's literal text asks for co-located tests on anything with logic; a 5-line test per factory would remove all doubt.

### 4. Testing Rigor & Coverage — **9 / 10**

**Thesis.** R8 + R12 are the spine of the project. They're kept.

**Evidence.**

- 36 test files, 239 tests, 100% pass rate, 2.99 s end-to-end (`yarn test`).
- Coverage matrix is honored — sampling confirms every route test exercises happy + validation + auth + domain-error paths. `posts/index.test.ts` is exemplary (176 lines, 7 cases including FORBIDDEN-when-not-author).
- Test helpers are disciplined: `@/server/testing` provides `callRoute` (in-process, no HTTP); `@/db/server/testing` provides an in-memory PGlite with real migrations applied (`createTestDatabase`). Both are used consistently across route tests.
- Clerk is mocked uniformly at the module boundary (`vi.mock('@clerk/nextjs/server', …)`) with a canonical fixture/helper shape repeated across files. No test hits the real Clerk API.

**Deductions.**

- **By design** per `docs/ui-law.md §1.3`, no React components are automatically tested — they're validated manually in the browser. This is an explicit choice, not a violation, but it means component-level regressions (keyboard behavior, focus, Clerk `<Show>` rendering, `database-dashboard.tsx` pagination) will only be caught by someone clicking through the app. Worth flagging as a risk surface the project has deliberately accepted.
- `src/server/defineRoute.ts` and `src/server/defineNamespace.ts` have no direct tests (see R12 deduction above).

### 5. Documentation Quality — **10 / 10**

**Thesis.** This is the strongest single dimension of the project. The docs aren't perimeter marketing — they are the authoritative contract, and the code demonstrably follows them.

**Evidence.**

- 8 authoritative domain docs (`backend-rules`, `ui-law`, `organization`, `seo`, `auth`, `database`, `ai`, `payments`), all `@`-referenced from `CLAUDE.md` and auto-loaded.
- 2,288 total lines of doc, structured consistently: architecture-in-30s, rule table, how-to, antipatterns, LLM checklist.
- `backend-rules.md` alone is 517 lines and includes end-to-end request flow, middleware patterns, error taxonomy, and a concrete method-addition walkthrough.
- Cross-document consistency is nearly perfect: `R8`/`R12` cite each other, `ui-law.md §1.3` mirrors `backend-rules.md` R12's exclusion table verbatim, `auth.md` A6 explicitly defers its `ensureUser` prescription to `database.md`.
- Each doc ends with an **LLM checklist** — a unique touch that makes the rules executable against a future agent's review.

**Deductions.** None at the level of quality. The one cosmetic nit (`specificaiton.md` typo) is called out in §10.

### 6. UI Law & Design System Compliance — **7 / 10**

**Thesis.** The parts of the UI Law that live in the table of rules — palette, mobile-first direction, three-state feedback — are followed with discipline. The parts that live in the **meta-rule** ("any new pattern must be added to the doc first") have drifted.

**Evidence — what's clean.**

- **Palette:** grep of `bg-*` / `text-*` / `border-*` for non-approved palettes (slate, gray, green, blue, etc.) returns **zero matches**. The doc says "zinc + red only"; the code says "zinc + red only".
- **Spacing:** grep for arbitrary values (`\[…px\]`, `\[#…\]`) returns zero matches in `.tsx` files (one exception below).
- **Mobile-first (§10):** every layout surveyed authors the base classes at mobile (`gap-8`, `px-4`, `py-10`, `flex-col`) and scales up at `sm:` / `md:`. The "stacked row → inline" recipe is applied consistently — see `src/app/app/_components/backend-demo.tsx:78–93` and `local-notes-inner.tsx:48–63`.
- **Three-state feedback (§6.3):** every async-action surface renders loading + success + error. `src/lib/use-async-action.ts` is the canonical hook and is used everywhere (`AiDemo`, `PremiumDemo`, `BackendDemo`, `DatabaseDashboard`, `RateLimitDemo`).
- **Theming:** `src/lib/themes.ts` + `themes.css` (460 lines, 6 palettes × light/dark) are wired per `ui-law §9`, FOUC-prevented via `THEME_BOOTSTRAP_SCRIPT` injected into `<head>` (`layout.tsx:67`).

**Deductions — where the meta-rule failed.**

- **`max-w-xl` / `max-w-2xl` / `max-w-5xl` undocumented.** `§5` lists only `max-w-3xl` as the centered-column width, yet:
  - `src/app/page.tsx:28`, `src/app/app/page.tsx:32`, `src/app/billing/page.tsx:23` use `max-w-xl`
  - `src/app/admin/page.tsx:22` uses `max-w-2xl`
  - `src/app/admin/page.tsx:14` uses `max-w-5xl` on the main container
  Each is a plausible choice, but `§11` (the amending procedure) mandates the doc leads, the code follows. Here the code led.
- **Arbitrary value in auth pages.** `src/app/sign-in/[[...sign-in]]/page.tsx:14` and `src/app/sign-up/[[...sign-up]]/page.tsx:14` both use `min-h-[calc(100vh-4rem)]` — a calc() arbitrary value. §3 says "No arbitrary values". The intent (fill viewport minus the 4rem sticky header) is legitimate; the fix is to either define `--header-height` and use `min-h-[calc(100vh-var(--header-height))]` with an exception noted in §5, or ship a `min-h-viewport-minus-header` utility class in the doc.
- **File length.** `src/app/admin/_components/database-dashboard.tsx` is **291 lines** — inside the 200–300 "split before adding more" band per `organization.md`, approaching the 300 hard ceiling. It already contains four components (`OverviewCard`, `Stat`, `TablesList`, `TableExplorer`) that each fit a split.

### 7. SEO & Discoverability — **8 / 10**

**Thesis.** Every page has metadata; sitemap, robots, `llms.txt` are wired; `noIndex` is applied correctly. One S3 violation on the only public page.

**Evidence — what's clean.**

- **S1** — all 6 page files (`page.tsx`) export `metadata` via `buildPageMetadata`. Verified by grep.
- **S4** — every `buildPageMetadata({...})` call passes `path`, producing a canonical URL (`src/server/seo.ts:22`).
- **S7 sync.** `/sitemap.xml` contains only `/` (`src/app/sitemap.ts`), which is correct: every other page has `noIndex: true` (`/app`, `/billing`, `/admin`, `/sign-in`, `/sign-up`). `public/llms.txt` lists `/` under `## Pages` with a matching one-liner. Both sources agree with the set of publicly-indexed routes.
- **S6.** Every page has exactly one `<h1>`. Sign-in / sign-up use `<h1 className="sr-only">` since the Clerk `<SignIn />` widget provides the visual heading — correct accessibility pattern.
- **S8.** 5 of 6 pages carry `noIndex: true`. The only public page is `/`.
- **S9.** `SITE_URL` is validated by Zod with `z.string().url().default('http://localhost:3000')` (`src/server/env.ts:7`).

**Deductions.**

- **S3 — description length.** The landing page (`/`, the only public-indexed page) has a description of ~180 characters (`src/app/page.tsx:9–11`), overshooting the 120–160 target by 20. The `/app` page also overshoots at ~180 chars, but is `noIndex` so S3 is advisory there. `/admin` (76 chars, noIndex) and `/sign-up` (117 chars, noIndex) undershoot 120, also advisory only. Net: **one public page in violation.**
- **S7 completeness.** `public/llms.txt` lists the public page correctly, but its doc-ref section (`/docs/backend-rules.md`, `/docs/ui-law.md`, …) links to paths that aren't actually served by the app (`docs/` is not under `public/`). An LLM crawler following those links gets 404s. Either serve the docs via a `/docs/[slug]/page.tsx` route or prefix with a real GitHub URL.

### 8. Security Posture — **9 / 10**

**Thesis.** Auth is centralized; secrets are separated from committed defaults; SQL-identifier injection is blocked; hosted-deploy misconfiguration is defended at two layers.

**Evidence.**

- **Auth composition.** `requireAuth` and `requireAdmin` are the only auth primitives; they are applied via `defineNamespace({ middleware })` or `defineRoute({ middleware })`. No `auth()` call is made inside a handler body (grep confirms).
- **Hosted-deploy defense-in-depth.** `src/server/env.ts:43–53` *refuses to boot* if `APP_ENV=development` is combined with `VERCEL=1` or `CI=true`. `src/server/middleware/admin-gate.ts:29–31` re-checks the same condition at request time. Both layers are deliberate; the comment at `admin-gate.ts:22–28` documents why.
- **SQL identifier escaping.** `src/db/server/repositories/health.ts:77–102` validates every `table` input against `information_schema.tables` before interpolating via `sql.identifier(table)`. This is the correct guard against SQL-identifier injection in an admin surface.
- **Secret hygiene.** `.env` is committed (2.1 KB, defaults only); `.env.local` is gitignored (1.9 KB). `OPENROUTER_API_KEY` is only read via `env.OPENROUTER_API_KEY`, never `process.env.OPENROUTER_API_KEY` in handlers (grep confirms).
- **Log hygiene (A4).** `ctx.log.warn('clerk user lookup failed', { id, error })` — error.message only, never the session claim bag. Sampled in `src/server/routes/users/index.ts:31–34`.
- **Rate limiting.** Per-user bucket when authenticated, IP fallback otherwise, falls back to `ip:anon` (fails closed not open) — `src/server/middleware/rate-limit.ts:19–28`.

**Deductions.**

- **Rate limiter is in-process.** `src/server/middleware/rate-limit.ts:12` — `const buckets = new Map<…>()`. Acknowledged in `docs/backend-rules.md` ("single Vercel function or dev server"), but the moment the app scales past one function instance, the limiter becomes a noisy approximation. Not a vulnerability today; a planned TODO.
- **`requireAdminOrDev` swallows Clerk errors.** `src/server/middleware/admin-gate.ts:41–43` — `try { … } catch { /* Clerk not configured */ }`. In the dev+keyless case this is right, but a swallowed `TypeError` from a buggy Clerk SDK update in dev would silently go unnoticed. Logging `ctx.log.debug('admin-gate: skipped clerk read', { error })` costs nothing.

### 9. Developer Ergonomics — **8 / 10**

**Thesis.** The project genuinely is "cloneable and it works". Keyless Clerk, auto-fallback PGlite, env validation at boot, pretty logs in dev, JSON logs in prod, a typed client with no codegen.

**Evidence.**

- **Zero-config dev start.** Clerk in keyless mode, PGlite-Node auto-selected when `DATABASE_URL` is absent (`src/db/server/driver.ts:14–25`), `.env` ships sensible defaults.
- **Hot env validation.** `src/server/env.ts:14–33` — boot fails fast with a field-level error report if an env is malformed.
- **Test ergonomics.** `callRoute(['users', 'list'], { db, input })` (`src/server/testing.ts`) + `createTestDatabase()` let route tests run in-process with real Drizzle + real migrations in ~80 ms each.
- **Error UX in the client.** `src/lib/use-async-action.ts` normalizes throws into `{ ok, code, message }` for three-state rendering; `src/lib/safe.ts` offers the opt-in Result variant; `BackendError.code` is literal-unioned for exhaustive switches.
- **Logging DX.** `ctx.log` is pre-populated with `{ requestId, method, path }` at the dispatcher; pretty single-line format in dev, JSON in prod.

**Deductions.**

- **No composite check script.** `package.json:scripts` has `lint` and `test` but no `check` / `verify` that chains `yarn lint && yarn tsc --noEmit && yarn test`. Every contributor has to remember all three. Adding a `"check": "yarn lint && tsc --noEmit && yarn test"` would close the gap.
- **No `db:reset` for dev.** If a dev trashes local PGlite state and wants a clean slate, they have to `rm -rf .data/pglite && yarn db:migrate`. A one-line script would be nicer.
- **AI preset model ids are suspicious.** `src/server/ai/presets.ts:12–14` points `fast` at `google/gemma-4-31b-it` and `smart` at `google/gemini-3-flash-preview`. Neither of those version strings maps to a currently-shipping Google model I can verify (tests mock the provider, so the suite doesn't catch a 404). If those are aspirational placeholder IDs, a developer hitting `/app` and clicking "ask" will get an unexplained provider error. Worth either verifying against <https://openrouter.ai/models> and pointing at a known-good id, or noting explicitly that presets must be re-pointed before first use.

### 10. Code Hygiene & File Organization — **8 / 10**

**Thesis.** Tight overall. One dead type export, one oversize file, one typo'd filename.

**Evidence — what's clean.**

- **No junk drawers.** No `utils.ts`, `helpers.ts`, `misc.ts` outside the shadcn-reserved `src/lib/utils.ts` (which holds only `cn()`).
- **No barrel abuse.** The only barrels are `src/db/schema/{server,client}/index.ts` — both documented as exceptions in `organization.md`.
- **Length distribution.** Excluding tests, the largest 10 source files are all under 300 lines; the median is 75 lines. Only one file (see deduction) crosses 200.
- **Single-purpose files.** Middleware is one concern per file (`auth.ts`, `admin-gate.ts`, `logging.ts`, `rate-limit.ts`, `require-plan.ts`).
- **`console.*` is fenced.** Grep returns three matches total: `logger.ts:30–32` (sink implementation), `migrate.ts:39/43` (CLI script), `env.ts:28` (boot error before logger exists). All legitimate.

**Deductions.**

- **`src/app/admin/_components/database-dashboard.tsx` is 291 lines** — in the 200–300 "split before adding more" band per `organization.md`. It already contains `OverviewCard`, `Stat`, `TablesList`, `TableExplorer` — each of which can trivially move to a sibling file in `src/app/admin/_components/`.
- **Dead code.** `src/types/note.ts:5–10` declares `createNoteInputSchema` and `CreateNoteInput` — neither is imported anywhere (grep confirms: only self-reference inside `note.ts`). The client notes repo validates via `title.trim() && body.trim()` in the UI and ignores the schema. Either wire it in or delete.
- **Typo'd filename.** The spec file on disk is `specificaiton.md` (wrong) and is referenced as `specificaiton.md` from `CLAUDE.md:7`. Both locations carry the same typo, which is self-consistent but wrong. Renaming to `specification.md` is a one-line fix plus the `CLAUDE.md` reference update.
- **Raw `Error` in a repo.** `src/db/server/repositories/users.ts:42` — raised in §3 under R7 compliance; mirrored here for organization symmetry.

---

## Scorecard

| # | Category | Score | Weight |
|---|----------|------:|-------:|
| 1 | Architecture & Design Philosophy | **9 / 10** | 10% |
| 2 | Type Safety & Contract Discipline | **9 / 10** | 10% |
| 3 | Backend Rules Compliance (R1–R12) | **9 / 10** | 10% |
| 4 | Testing Rigor & Coverage | **9 / 10** | 10% |
| 5 | Documentation Quality | **10 / 10** | 10% |
| 6 | UI Law & Design System Compliance | **7 / 10** | 10% |
| 7 | SEO & Discoverability | **8 / 10** | 10% |
| 8 | Security Posture | **9 / 10** | 10% |
| 9 | Developer Ergonomics | **8 / 10** | 10% |
| 10 | Code Hygiene & File Organization | **8 / 10** | 10% |

### **Total: 86 / 100**

Evenly-weighted arithmetic sum. Categories chosen to map onto the project's own rulebooks, not arbitrary industry checklists.

---

## Principal Risks (ranked)

1. **UI regressions are not gated.** `ui-law §1.3` elects manual browser testing over component unit tests. This is a legitimate trade-off at boilerplate scale, but every downstream fork that doesn't compensate (Playwright, Storybook visual tests) inherits the risk. Document this explicitly in `README.md` for forkers.
2. **AI preset model ids are unverified.** If `google/gemma-4-31b-it` and `google/gemini-3-flash-preview` aren't resolvable on OpenRouter at fork time, `/app` → AI demo breaks silently. Tests pass because they mock `generateChat`.
3. **Rate limiter is in-process.** Fine for a single Vercel function, wrong for any horizontal scale-out. The path to Redis is documented; the deadline to take it is the moment the app stops being a single function.
4. **`requireAdminOrDev`'s swallowed catch.** A Clerk SDK regression in dev could hide a real error behind "it's probably just unconfigured".

## Recommended Priorities (two-commit sprint)

**Commit A — polish the meta-rule breaches (UI Law + SEO).**

1. Amend `docs/ui-law.md §5` to add rows for `max-w-xl` (reading column), `max-w-2xl` (admin prose column), `max-w-5xl` (admin dashboard container). One-line rationale each.
2. Either document `min-h-[calc(100vh-4rem)]` in §5 as the auth-page exception or add a `--header-height` variable and derive the class from it.
3. Rewrite `src/app/page.tsx` metadata description to land in 120–160 chars.
4. Split `src/app/admin/_components/database-dashboard.tsx` into 4 sibling files — one per component.

**Commit B — tighten the backend nits.**

1. Change `src/db/server/repositories/users.ts:42` from `throw new Error(...)` to `throw new BackendError(500, 'INTERNAL', ...)`.
2. Add `src/server/defineRoute.test.ts` and `src/server/defineNamespace.test.ts` — 5 lines each, proves the factories return the expected `__kind` + wire-through.
3. Delete `createNoteInputSchema` / `CreateNoteInput` from `src/types/note.ts` unless a caller lands in the same commit.
4. Rename `specificaiton.md` → `specification.md`; update the reference in `CLAUDE.md`.
5. Add a `"check": "yarn lint && tsc --noEmit && yarn test"` script to `package.json`.

Neither commit needs more than an hour.

---

## Verdict

**Strongest:** documentation. `docs/backend-rules.md` is not a README — it is an executable contract, cross-referenced from the code, mirrored into cross-file checklists, and kept honest by R12. Very few codebases of this size achieve this.

**Weakest:** the meta-rule loop in `docs/ui-law.md §11`. The rule says "amend the doc first, then write the code in the same commit". The doc *wasn't* amended for the max-w-* widths or the auth-page calc() — so whatever discipline elsewhere, the meta-rule has cracked. That's worth closing, because once the pattern is "amend retroactively (or not at all)", the doc becomes advisory and the rest of the §11 machinery unravels.

**Net.** 86 / 100 is a faithful reading. This is a rigorous, type-safe, well-tested, self-documenting boilerplate. The gap to 95 is not conceptual redesign; it is one afternoon of closing the nits above. The gap to 100 is genuinely subjective taste (component tests, composite check script, reified `ctx.meta` types).

*Generated 2026-04-17 against HEAD `e4a170c`, VERSION `0.20.0`.*
