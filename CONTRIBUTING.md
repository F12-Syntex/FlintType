# Contributing to flinttype

Thanks for considering a contribution. This document covers everything you need to ship a change — local setup, the rules you'll be held to, the commit format, and the PR loop. If anything here is unclear, open a [GitHub Discussion](https://github.com/saifkhan2003/flinttype/discussions) and we'll fix the docs.

## Before you start

- **First-time contributors** — look for issues tagged [`good first issue`](https://github.com/saifkhan2003/flinttype/labels/good%20first%20issue) and [`help wanted`](https://github.com/saifkhan2003/flinttype/labels/help%20wanted).
- **Large or speculative changes** — open an issue or [Discussion](https://github.com/saifkhan2003/flinttype/discussions) *first* so we can agree on scope before you spend hours coding. Drive-by 1000-line PRs without prior discussion get harder to land, not easier.
- **Bug reports and feature requests** — use the [issue templates](https://github.com/saifkhan2003/flinttype/issues/new/choose). Each one tells us what we need to triage quickly.

## Local development

```bash
git clone https://github.com/saifkhan2003/flinttype.git
cd flinttype
yarn install
yarn dev
```

That's it. flinttype boots without any env vars:

- **Auth** — Clerk runs in *keyless mode* and prints a "Configure your application" prompt when you first hit a signed-in surface.
- **Database** — falls back to PGlite-Node, a file-backed local Postgres in `./.data/pglite/`. No Docker, no Postgres install.

To wire real services, copy keys into `.env.local` (gitignored):

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...           # Neon for prod-like testing
OPENROUTER_API_KEY=sk-or-v1-...         # only needed for AI routes
```

Never commit `.env.local`. The committed `.env` holds defaults only.

### Package manager: Yarn classic

This repo pins Yarn 1.22.22 in `package.json` → `packageManager`. **Always use `yarn`** — never `npm`. The lockfile is `yarn.lock`; there must be no `package-lock.json`.

## The rules

flinttype has six authoritative docs that codify how code is written. Skim them once before your first PR; refer back per area.

| Doc                                              | When you're touching…                                                 |
|--------------------------------------------------|------------------------------------------------------------------------|
| [`docs/backend-rules.md`](docs/backend-rules.md) | Anything under `src/server/**` — 12 rules, middleware patterns, tests  |
| [`docs/ui-law.md`](docs/ui-law.md)               | Anything visual — colours, spacing, typography, mobile-first, theming  |
| [`docs/organization.md`](docs/organization.md)   | Adding a file or growing one — length thresholds, decision table       |
| [`docs/seo.md`](docs/seo.md)                     | Adding a page — metadata, semantic HTML, `llms.txt`, sitemap sync      |
| [`docs/auth.md`](docs/auth.md)                   | Anything Clerk — `requireAuth`, `requireAdmin`, session claims         |
| [`docs/database.md`](docs/database.md)           | Anything Drizzle — schema, repos, migrations, server + client tiers    |

A few rules worth pulling out:

### Types live in `src/types/<domain>.ts`
Every route I/O type, every domain model, every Zod schema. Route files import — they never declare types. (`docs/backend-rules.md` R1.)

### Tests ship in the same commit as the code
Backend, middleware, helpers, repos — everything under `src/server/**`, `src/lib/**` (non-React), and `src/db/**` has a co-located `*.test.ts`. React components are tested manually in the browser. (`docs/backend-rules.md` R12, `docs/ui-law.md` §1.3.)

### File length thresholds
Under 150 lines is healthy. 200–300 → split before adding more. >300 → split now. Function bodies >30 lines → consider extracting. (`docs/organization.md`.)

### No barrel re-exports
The only sanctioned barrels are `src/server/index.ts` and `src/components/ft/index.ts`. Don't add new ones. (`docs/organization.md`.)

### Mobile-first is non-optional
Unprefixed Tailwind classes target 375px viewports; `sm:` / `md:` / `lg:` only scale *up*. Verify at both 375px and ≥1024px in a real browser before shipping. (`docs/ui-law.md` §10.)

### Use the `impeccable` skill for UI work
For any UI/UX change, invoke the `impeccable` skill *before* writing or editing UI code. It enforces design-context loading and shared design laws. (`CLAUDE.md`.)

## Code style

- **Linter** — `yarn lint` (eslint). PRs must pass.
- **Types** — `yarn tsc --noEmit` must be green. No `any` without a comment justifying it.
- **Formatter** — there is no Prettier config; match the surrounding style. Code reviews will not bikeshed formatting.
- **Comments** — default to writing none. Only add one when the *why* is non-obvious (a hidden constraint, an invariant, a workaround for a specific bug). Don't explain *what* the code does — well-named identifiers do that.

## Tests

```bash
yarn test            # one-shot run
yarn test:watch      # vitest in watch mode
yarn tsc --noEmit    # type-check
yarn lint            # eslint
```

All four must pass before merge. CI runs them on every PR (see `.github/workflows/ci.yml`).

## Commits

Conventional Commits format. Subject + body only. **No AI attribution ever** — no `Co-Authored-By: Claude`, no "Generated with …" footer, no emoji signatures.

```
type(scope): short title

0.0.1

- terse bullet of what changed
- terse bullet of why
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `style`.

### Version discipline

Every commit bumps `VERSION` *and* `package.json` → `version` to the same value. Both must match.

| Bump  | When                                          |
|-------|-----------------------------------------------|
| Patch | Default — small fix, docs, chore              |
| Minor | New user-facing feature                       |
| Major | Breaking change                               |

The first line of the commit body is the new version.

### One logical change per commit

Don't bundle unrelated work. Stage only files *you* changed (`git add <paths>`) — never `git add -A`, the maintainer may have unrelated untracked work.

## Pull requests

1. Fork the repo and create a topic branch off `master`.
2. Make your change. Commit with the format above.
3. Push to your fork and open a PR against `saifkhan2003/flinttype:master`.
4. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) — it asks for the *why*, the screenshots if visual, and a test plan.
5. CI must be green. Reviewers will request changes if the rule docs aren't followed.

### What a great PR looks like

- One logical change, scoped tight enough to review in a single sitting.
- Tests included for new backend/data-layer code (R12).
- Screenshots at **both** 375px and ≥1024px for visual changes (`docs/ui-law.md` §10.3).
- If a new pattern (colour, spacing, typography, layout) is introduced, the relevant doc is amended in the *same* commit (the meta-rule in `docs/ui-law.md`).
- The PR description tells me *why* — the *what* is in the diff.

## Reporting bugs and requesting features

Please use the issue templates:
- [Bug report](https://github.com/saifkhan2003/flinttype/issues/new?template=bug_report.yml)
- [Feature request](https://github.com/saifkhan2003/flinttype/issues/new?template=feature_request.yml)
- For questions, open a [Discussion](https://github.com/saifkhan2003/flinttype/discussions) instead.

## Security vulnerabilities

**Do not open a public issue.** Follow the process in [`SECURITY.md`](SECURITY.md) — private disclosure via email or GitHub's "Report a vulnerability" button.

## Code of conduct

By participating, you agree to abide by the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md). Be the contributor you'd want to work with.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
