# flinttype — Specification

**Version**: 6.38.3
**Status**: Active development, open-source

---

## 1. What flinttype is

flinttype is an open-source typing speed test, built in the editorial-mechanical idiom — JetBrains Mono everywhere, hairline borders, a single coral accent against paper-and-ink. It's the second of its kind, sitting in the same product space as MonkeyType, 10fastfingers, KeyHero — but with a different aesthetic bias and a different architectural one.

The product runs as a Next.js app deployed on Vercel, backed by Neon Postgres for persistence and Clerk for identity. Every visual surface and behaviour is user-customisable through a single `/customise` settings tree, persisted as a JSON prefs blob on the server. Themes, keymaps, fonts, caret style, chrome density, and a "Monkeytype-leaning" minimisation slate are all composed from independent knobs — three preset bundles (Editorial / Minimal / Stripped) cover the common landings.

Beyond solo practice, flinttype ships:

- **Drills** — burst (rep-based) and sudden-death (any-error-resets) modes derived from a per-user statistical model of slow bigrams, trigrams, words, and motor features.
- **Adaptive mode** — the practice surface can pull the next word list from a server-side adaptive engine that scores the user against their own model and biases toward weak spots.
- **Races** — 4-player real-time races backed by an in-memory room engine with SSE broadcasts. Bots fill empty seats; challenge mode generates a shareable lobby link.
- **Profiles + leaderboards + insights** — historical results, per-user analytics, mode/window-scoped global rankings.
- **MonkeyType import** — pulls a user's existing MonkeyType account via their Ape Key and decrypts results + stats client-side before persisting.

---

## 2. Capabilities (what a user can do)

### 2.1 Practice
- Pick a **mode** (Words / Time / Quote) and a **length** preset, or type a custom count.
- Toggle **adaptive mode**: server selects next words based on the user's bigram/trigram/word/motor-feature models. Falls back to local generation on a cold model or a fetch failure.
- Quote mode pulls from four curated groups (short / medium / long / thicc) sourced async.
- Live readouts mid-test: WPM (or CPM/WPS/CPS/WPH), accuracy, burst speed, progress / remaining time. Each metric independently togglable (off / text / mini / flash).
- Live virtual keyboard widget under the passage in four physical layouts (staggered / matrix / split / alice) and four logical layouts (QWERTY / Dvorak / Colemak / Carpalx), with five visual designs (solid / outline / ghost / lifted / glass) and three key shapes (square / rounded / pill).
- Caret styles: line / block / underline / outline / off, each with width / radius / blink-speed / smooth-motion controls. Optional idle pulse during rest.
- Result screen with WPM chart, per-letter heatmap, hand-balance breakdown, error highlights, share-as-image export.

### 2.2 Drills (`/drills`)
- **Burst** drills (default 5 reps; pangrams always 1):
  - `burst-1000` — discovery grid over the 1000 most common English words, per-word progress persisted to prefs.
  - `burst-top-100` — most-common-100 sprint.
  - `trigram-burst`, `pangram-burst`, `numbers-and-symbols`.
- **Sudden-death** drills (any error resets the count):
  - `worst-words` — top 20 worst from the user's `word_models` table.
  - `weakest-bigrams` — top 12 from `bigram_models`.
  - `tricky-words` — curated list (rhythm, yacht, etc.).

### 2.3 Races (`/race`)
- Public matchmaking: join a queue, get placed into a 4-player room. Real players are filled in over 5 s; remaining seats fill with bots.
- Challenge lobbies (`/race/c/[slug]`): host creates a private room, shares a slug link; up to three joiners.
- Bots have hand-tuned profiles (Turbo / Shadow / Flash / Specter) with WPM ranges and per-keystroke jitter.
- Per-racer live lanes with WPM, position, error chips. Optional per-player colour, opponent-marker style (off / tint / text), race feed, opponent-WPM display.
- Rematch voting auto-starts a new round when the threshold is met; leave is explicit.

### 2.4 Profiles + leaderboards
- `/profile/[username]` resolves Clerk usernames or `user_*` IDs.
- Personal-best by mode + length; identity tags (OG / OWNER) rendered next to the display name.
- `/leaderboard` ranked by mode + window (day / week / month / all-time).
- `/insights` — analytics dashboard.

### 2.5 Customisation (`/customise`)
- Two top-level surfaces: **Appearance** and **Behaviour**.
- Appearance is split into 14 sub-sections (Themes & mode, Colors, Geometry, Surface, Chrome, Caret, Typography, Keyboard, Background, Live stats, Typing area, Result, Keymap, Multiplayer) — each with live previews that mount the real on-page components inside a frozen practice context.
- **47** distinct appearance fields are persisted per user.
- **24** shipped themes (community palettes sourced from tweakcn) plus a Background-reactive synthetic theme that samples the user's background image and synthesises a palette.
- A "Custom" palette state arises whenever the user diverges from a named theme via per-var overrides.
- Three Surface presets (Editorial / Minimal / Stripped) bundle ten knobs at once for fast minimisation.
- Global **Focus mode** keyboard shortcut (`F` outside an input → strip everything; `Esc` restores). Session-scoped, doesn't write to prefs.
- Settings JSON export / import. MonkeyType import flow (Ape Key decryption + record translation).

### 2.6 Identity + tags
- Sign-in / sign-up flows owned by Clerk (catch-all routes `[[...sign-in]]` / `[[...sign-up]]`).
- Identity tag chips (`<UserTag>`): currently OG (first N signups, granted server-side from `users.seq`) and OWNER. Per-tag colour quartets fixed across every palette so the chip carries the same meaning everywhere.
- In-app notification feed for personal bests, tag grants, announcements.

---

## 3. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│   Next.js App Router + React 19                             │
│   - PracticeContext (state machine)                         │
│   - useBackend() Proxy → POST /api/<path>                   │
│   - prefs-store (localStorage + debounced server sync)      │
│   - Theme/palette providers, BackgroundApplier, etc.        │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP (Clerk cookie carries auth)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Vercel function: src/app/api/[...path]/route.ts             │
│   Single catch-all dispatcher                                │
│    - Mints requestId, builds child Logger                    │
│    - Resolves path through router tree                       │
│    - Runs middleware onion (logging → auth → rate-limit →   │
│      per-route → validate(Zod) → handler)                   │
│    - Serialises BackendError + ZodError as typed JSON       │
└──────────────────┬──────────────────────────────────────────┘
                   │
       ┌───────────┼──────────────────────────┐
       ▼           ▼                          ▼
   ┌───────┐   ┌────────────┐         ┌──────────────┐
   │ Clerk │   │ Neon       │         │ In-memory    │
   │ (auth)│   │ Postgres   │         │ race rooms   │
   └───────┘   │ + Drizzle  │         │ (per-process)│
               └────────────┘         └──────────────┘
```

The frontend never imports from `@/server/*`. Public surface is `@/types/*` (types only), `@/lib/backend` (Proxy + `setBackendHeaders`), `@/lib/errors` (`BackendError` + `ErrorCode`, isomorphic), `@/lib/safe` (`Result` wrapper). Anything else is server-only.

---

## 4. Tech stack

### Runtime dependencies (30)
| Concern | Library | Notes |
|---|---|---|
| Framework | `next@16.2.4` | App Router, server components, Turbopack dev |
| UI runtime | `react@19.2.4` + `react-dom@19.2.4` | Latest stable |
| Auth | `@clerk/nextjs@7` | Cookie session, organisations, dashboard-managed roles |
| ORM | `drizzle-orm@0.45` | Type-safe SQL, file-based migrations |
| DB driver (prod) | `@neondatabase/serverless` | HTTP fetch per query, no pool |
| DB driver (dev) | `@electric-sql/pglite` | Embedded Postgres for local dev + tests |
| Validation | `zod@4` | Every wire input validated |
| Theming | `next-themes` | Light/dark mode + system pref |
| Styling | `tailwindcss@4` + `tailwind-merge` + `clsx` + `class-variance-authority` + `tw-animate-css` | CSS-first design tokens via `@theme` |
| Components | `shadcn@4` + `@base-ui/react` + `@radix-ui/react-*` (dropdown, popover, radio, slider, tooltip) | Headless primitives + project skin |
| Icons | `lucide-react` + `react-icons` | Lucide is canonical; react-icons fallback |
| Motion | `framer-motion@12` | Used sparingly, see `docs/ui-law.md §13` |
| Charts | `recharts@3` | WPM chart, distribution |
| Image export | `html-to-image` | Result-screen share |
| Colour pickers | `@uiw/color-convert` + `@uiw/react-color-hue` + `@uiw/react-color-saturation` | Appearance page |
| LLM | `ai@6` + `@openrouter/ai-sdk-provider` | Vercel AI SDK; OpenRouter provider for adaptive / future model-backed features |

### Dev dependencies (15, material ones)
- `typescript@5` — strict mode.
- `vitest@4` + `@vitest/ui` + `happy-dom` + `@testing-library/react` + `@testing-library/dom` — test stack.
- `drizzle-kit` — migrations + Studio.
- `tsx` — TS executor for scripts.
- `eslint@9` + `eslint-config-next`.
- Yarn classic (`yarn@1.22.22`, pinned in `packageManager`).

### Project-scoped MCP servers (`.mcp.json`)
- **shadcn** — component installs + registry queries.
- **magic** — 21st.dev component generation (requires `TWENTYFIRST_API_KEY`).
- **context7** — authoritative docs for Next.js / Tailwind / shadcn / React (Next 16 is newer than most LLM training data).
- **clerk** — Clerk dashboard + docs via HTTP transport.

---

## 5. Backend

### 5.1 Architecture
A typed route tree rooted at `src/server/router.ts`. A single catch-all dispatcher at `src/app/api/[...path]/route.ts` resolves the URL path, walks the tree, collects middleware at every level, runs the pipeline, and returns JSON. The frontend consumes it via `useBackend()` — a recursive `Proxy` typed from `typeof router`. Adding a route on the server immediately makes it available and typed on the client with no codegen.

```ts
backend.users.admins.list()
  ↓
POST /api/users/admins/list
  ↓ dispatcher resolves → [logging, requireAuth, requireAdmin]
  ↓ runs onion → validate(input) → handler({ input, req, meta, log, db })
  ↓ serialises (BackendError → typed JSON; ZodError → VALIDATION 400)
  ↓ client reconstructs and throws BackendError
```

### 5.2 Authoring contract (the 12 rules)
Full text in `docs/backend-rules.md`. Highlights:
- **R1** — every I/O type and Zod schema in `src/types/<domain>.ts`. Routes import; never declare inline.
- **R2** — `defineRoute<Input, Output>({...})` with explicit generics.
- **R4** — Zod validates every wire input.
- **R6** — middleware attaches at the right level (global → namespace → route).
- **R7** — `BackendError(status, code, message, details)` is the only thing the dispatcher serialises cleanly.
- **R8 / R12** — every route + every middleware/helper ships with a co-located `*.test.ts` in the same commit. Run via `callRoute()` from `@/server/testing`, no HTTP.
- **R9** — client never imports from `@/server/*`. The boundary is `@/types`, `@/lib/backend`, `@/lib/errors`, `@/lib/safe`.
- **R11** — routes are top-level consts; `defineNamespace.routes` only references identifiers.

### 5.3 Namespaces shipped
| Namespace | Methods | Middleware |
|---|---|---|
| `health` | `ping` | public, IP rate-limited |
| `prefs` | `get`, `set` | requireAuth, per-user rate-limit |
| `history` | `summary`, `publicProfile` | requireAuth (summary), public (profile) |
| `adapt` | `words`, `submit`, `snapshot`, `scoreWord` | requireAuth |
| `race` | `queue`, `keystroke`, `leave`, `rematch`, plus `challenge.{create,join,start,cancel}` | requireAuth + IP rate-limit on keystroke firehose |
| `leaderboard` | `list` | public, IP rate-limit |
| `profile` | `updateUsername`, `setTags` | requireAuth |
| `monkeytype` | `import` | requireAuth, low rate-limit (3/h) |
| `notifications` | `list`, `markRead`, `markAllRead` | requireAuth |
| `admin` | `backfillOg` | `requireAdminOrDev` (dev passthrough; admin role in prod) |
| `users` | `list`, plus `admins.list`, `admins.invite`, `admins.remove` | requireAuth + requireAdmin on nested |

### 5.4 Errors
Typed `ErrorCode` union in `src/server/errors.ts`: `VALIDATION` (400), `UNAUTHORIZED` (401), `PAYMENT_REQUIRED` (402), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL` (500). Adding a new code requires editing the union first. Tests narrow on `.code`.

### 5.5 Rate limiting
`src/server/middleware/rate-limit.ts` — fixed-window in-memory limiter. Keyed by `ctx.meta.userId` if present, else first IP on `x-forwarded-for`. Public API: `rateLimit({ limit, windowMs })`. In-memory works for single-instance Vercel functions; Redis swap-in is a future change to one file only.

### 5.6 Logging
`src/server/logger.ts` — every handler/middleware receives `ctx.log`, a request-scoped `Logger` pre-populated with `{ requestId, method, path }`. JSON in prod, pretty single-line in dev. Levels: debug / info / warn / error. Controlled by `LOG_ENABLED` + `LOG_LEVEL` env vars. The dispatcher and the global `logging` middleware between them emit:

| Event | Level | Fields |
|---|---|---|
| request start | debug | requestId, method, path |
| request ok | info | + durationMs |
| request failed (BackendError) | warn | + durationMs, status, code |
| request crashed (unknown throw) | error | + durationMs, error stack |
| route not found / invalid JSON | warn | (dispatcher-level) |

### 5.7 Auth (`docs/auth.md`)
- `requireAuth` middleware reads `auth()` from `@clerk/nextjs/server`, publishes `ctx.meta.userId` + `sessionClaims`.
- `requireAdmin` reads `sessionClaims.metadata.role === 'admin'` (Clerk dashboard wires `metadata` into the session token).
- `requireAdminOrDev` opens up in local dev (`APP_ENV=development` + not on Vercel/CI) so the admin namespace is usable without Clerk configured.
- `ensureUser(ctx)` materialises the local `users` mirror row on first authenticated request to any route that needs an FK or join. Triggers OG-grant if eligible.

---

## 6. Database

Drizzle ORM on Postgres. Schema in `src/db/schema/` (shared across server tier and the optional client-side PGlite). Server tier uses Neon's HTTP driver in production and PGlite-Node in dev (`DATABASE_MODE=auto` switches based on whether `DATABASE_URL` is set).

### 6.1 Tables shipped
| Table | Purpose |
|---|---|
| `users` | Mirror of Clerk identities. `id` (Clerk user ID), `seq` (SERIAL signup order — used for OG grant cutoff), `createdAt`, `ogGrantedAt`. |
| `user_prefs` | Opaque JSON prefs blob per user — appearance, behaviour, theme overrides, drill progress, all slices share one row. `(userId PRIMARY, data JSONB, updatedAt)`. Client owns the shape. |
| `tests` | Per-test summary. `mode`, `durationOrWordCount`, `wpm`, `accuracy`, `errorCount`, `resetCount`, `wasCompleted`, indexed on `(userId, startedAt)` for history reads. |
| `bigram_models` | Per-user bigram timing model. `(userId, bigram)` PK, `meanMs`, `varianceMs`, `sampleCount`. Welford incremental. |
| `trigram_models` | Same shape, trigrams. |
| `word_models` | Per-user per-word timing. Feeds the worst-words drill. |
| `motor_feature_models` | Per-user per-motor-feature (finger-map-specific) timing. Invalidated when the user changes hand layout. |
| `notifications` | In-app feed. `(userId, createdAt)` index. `readAt` nullable; flips on `markRead`. |

### 6.2 Access pattern
- Handlers call `ctx.db.<repo>.<method>` — never raw Drizzle. Repos under `src/db/server/repositories/` expose hand-rolled methods (`list`, `findById`, `create`, etc.). The `Database` shape is the public API; swapping driver doesn't change the handler surface.
- `ctx.db.$drizzle` is the escape hatch when a query doesn't fit a repo method; once you use it, add the method.
- `$health` is an inspection-only repo consumed by the `admin` namespace.

### 6.3 Migrations
- Server: file-based via `drizzle-kit generate` → `src/db/migrations/server/`. Applied by `yarn db:migrate` (dev) or in the build step (prod).
- Schema changes ship in the same commit as the migration SQL file (D8).
- Client side has no migrations — `ensureClientSchema()` runs `CREATE TABLE IF NOT EXISTS` on first query.

---

## 7. Practice / typing engine

Pure reducer in `src/app/_components/practice-reducer.ts`; React-side context + hooks in `practice-state.tsx`.

### 7.1 State shape (subset)
```ts
{
  mode: 'WORDS' | 'TIME' | 'QUOTE',
  length: number | QuoteGroupId,
  adapt: boolean,
  phase: 'rest' | 'running' | 'done',
  words: string[],
  cursorWord: number,
  cursorChar: number,
  errorWords: Set<number>,
  startTime: number | null,
  endTime: number | null,
  events: KeyEvent[],   // one per keystroke: { t, expected, typed, correct, wordIndex }
  typed: string[],      // per-word actual user input
  totalChars: number,
  correctChars: number,
  quoteSource: string | null,
}
```

### 7.2 Actions
`SET_MODE`, `SET_LENGTH`, `TOGGLE_ADAPT`, `TYPE_CHAR`, `BACKSPACE`, `BACKSPACE_WORD`, `SPACE`, `RESTART`, `FINISH_TIME`, `REGENERATE`. The reducer respects:
- `stopOnError` (sudden-death drills): any wrong char halts the run.
- `allowExtras`: typing past the target word's length still tracks the input.
- Word-length filter + secondary decoration (numbers / punctuation) from behaviour prefs.

### 7.3 WPM (`src/lib/wpm.ts`)
- **WPM** = (`correctChars` / 5) / (elapsedMs / 60000).
- **Raw WPM** = same but counts every keystroke, not just corrects.
- **Accuracy** = `correctChars` / `totalChars` × 100.

### 7.4 Adaptive mode (`src/lib/use-adapt.ts`)
A small prefetch queue keeps up to 5 pre-generated batches keyed by `(count, pool)`. On each rest the queue dequeues; in the background the next batch is fetched from `/api/adapt/words`. Words come back already filtered by the user's `minWordLength` and decorated with secondaries if `showSecondary` is on. Fetch failure or a cold model falls back to local generation transparently.

### 7.5 Drills
- Drill definitions in `src/app/drills/_components/drills-data.ts`. Each carries a `kind` (`burst` or `sudden-death`), a source (`top-100` / `bigram-model` / `worst-words` / curated list), a per-rep count, and any drill-specific options.
- The drill surface mounts `TypingSurface` with `lockedWords` to pin the passage; restart re-uses the same words; adapt / mode-bar are short-circuited.
- Per-drill progress (`burstReps`, `burst-1000` discovery grid, sudden-death streaks) is persisted as a sub-slice of the prefs blob.

---

## 8. Race engine

In-memory room engine at `src/server/race/room.ts`. **Real-time updates are SSE**, not WebSockets — one persistent EventSource per client subscribed to the room's snapshot stream.

### 8.1 Lifecycle
```
matching (5 s wait for real players)
  → lobby (0.7 s hold)
  → countdown (3 s)
  → racing (until everyone done or timeout)
  → finished (rematch voting)
```

### 8.2 Entry points
- **Public**: `POST /api/race/queue` joins matchmaking. Creates a room if none open; joins the first available; bots fill the remainder after the matching window.
- **Challenge**: `POST /api/race/challenge.create` returns a slug + URL. `POST /api/race/challenge.join` joins by slug. Host can `start` or `cancel`.
- **Stream**: `GET /api/race/stream/[roomId]` opens an SSE stream of snapshots (~12 Hz throttle, 15 s heartbeat).
- **Writes**: `POST /api/race/keystroke` (600/min/IP firehose), `POST /api/race/leave`, `POST /api/race/rematch` (idempotent).

### 8.3 Bots
Four profiles (Turbo / Shadow / Flash / Specter) with hand-tuned WPM ranges. Filled on 1 s intervals during matchmaking. During the race they tick every 100 ms; `instantBotWpm(seed, profile, elapsedMs, mistakes)` produces a stable trajectory with sub-character fractional accumulator so motion stays smooth at low WPM.

### 8.4 Snapshot shape
Each broadcast carries per-racer position, WPM, error count, plus the room phase, round number, and any feed events (joins, leader changes, finishes, milestones).

---

## 9. Customisation + theming

### 9.1 Prefs persistence
A single JSON blob per user in the `user_prefs` table. Client-side store at `src/lib/prefs-store.ts`:
- Anonymous users: localStorage only (silent 401 on POST).
- Signed-in users: load from `/api/prefs/get` on mount, debounced POST on change.
- Subscribe model: every change notifies all `useRemotePrefs` consumers; React re-renders. Slices are addressable by string key (`appearance`, `behaviour`, `caret`, `keyboard`, `theme`, `palette`, `background`, `drillProgress`, etc.).

### 9.2 Themes (`src/lib/themes/`)
- **24** named palettes in `themes.json`, sourced from tweakcn. Each defines a `cssVars.{light,dark}` block written onto `<html>` when the user picks the palette.
- A synthetic **Background-reactive** entry samples the user's background image (32×32 average) and synthesises a 17-stop palette.
- A synthetic **Custom** state arises when the user diverges from any named palette via the Colors / Geometry / Typography sections.
- Theme scope rule: **themes only own colours / geometry / typography / keyboard widget settings**. Caret, live stats, tape mode, lines rendered, multiplayer, etc. are user-owned and survive a theme switch. Themes own visual identity, not behaviour.
- Per-theme hand-curated keyboard widget preset (design + shape) lives in `src/lib/themes/presets.ts`.
- New themes added by `yarn themes:add <tweakcn-url>`.

### 9.3 Appearance pref surface
- **47** distinct fields in `AppearancePrefs` covering live stats, passage rendering, result screen, keymap, borders, multiplayer, surface, chrome.
- **Surface** section (added 6.38.0): `cardSurfaces` (solid / subtle / transparent), `dividers` (hairline / dashed / hidden), `pagePadding` (tight / comfortable / roomy), `backgroundFill` (themed / bare), `monochromeChrome`, plus a three-bundle preset (Editorial / Minimal / Stripped) that writes ten knobs at once.
- **Chrome** section: `topbarStyle` (elevated / flat / text-only), `footerStyle` (visible / compact / hidden), `modeBarStyle` (chips / inline / hidden), `autoHide` (off / dim / fade — fades sticky chrome while phase === "running", restores on rest / Esc / done).
- **Focus mode**: global `F` shortcut (outside an input) toggles `<html data-ft-focus="on">` for a session-only stripped view. `Esc` clears.

### 9.4 Implementation contract for minimisation knobs (`docs/ui-law.md §15`)
Every Surface / Chrome knob lands as an `<html data-ft-…>` attribute via a top-level `AppearanceApplier`. `globals.css` owns every visual rule. Components don't re-render on these prefs except where genuinely needed (ModeBar swaps render trees, Readouts gates on `none`, Passage on caret idle / quote attribution). Cheapest possible toggle cost.

---

## 10. Design system

`docs/ui-law.md` is the authoritative design document — 15+ sections covering colour, spacing, typography, layout recipes, component reuse, async-action feedback, accessibility, mobile-first mandate, theming, flinttype primitives, settings layout, animation, identity marks, and minimisation knobs.

Highlights of how the docs constrain the code:

- **Meta-rule** — any new pattern (colour role, spacing value, typography class, layout) must be added to the doc *first*, in the same commit as the code using it. The doc leads; the code follows.
- **Colour layer 1** (semantic) — `bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary` etc. swap automatically with the active theme + mode. Defaults from `:root` / `.dark`; per-palette overrides in `themes.css`.
- **Colour layer 2** (fixed) — `ft-*` tokens (`bg-ft-paper`, `text-ft-ink`, `bg-ft-ember`, etc.) don't swap with theme. Used by surfaces that are intentionally fixed regardless of palette (the dark race screen, supporter pricing card). New components prefer layer 1.
- **Typography** — JetBrains Mono everywhere. No proportional sans, no serif, no second face.
- **Mobile-first mandate** — every UI authored for 375 px first, `sm:` / `md:` / `lg:` prefixes only scale up. Manual verification at 375 px and ≥ 1024 px in a real browser is a hard gate; no automated test enforces it.
- **shadcn primitives are the source of primitives** — install via the shadcn MCP, never hand-roll a `<button>`.
- **flinttype primitives** (`src/components/ft/`) — `<Logo>`, `<TopBar>`, `<MobileNav>`, `<IdentDot>`, `<Tag>`, `<Stat>`, `<Panel>`, `<Kbd>`, `<FtButton>`, `<UserTag>`. Used everywhere; never reproduce their markup inline.
- **Frontend testing policy** — React components / pages / route-scoped `_components` are tested manually in the browser. Only the data layer + isomorphic helpers + the backend get unit tests (Vitest). Pure reducers inside `_components` files can still be tested (live precedent: `practice-state.test.ts`).

---

## 11. Repository layout

```
src/
├── app/                        # Next.js App Router routes
│   ├── api/[...path]/route.ts  # backend dispatcher (single file)
│   ├── _components/            # cross-surface practice + keyboard primitives
│   ├── customise/              # settings tree
│   │   ├── appearance/         # 14 sub-sections + previews
│   │   └── behaviour/          # word filters, input handling, etc.
│   ├── race/                   # /race + /race/c/[slug]
│   ├── drills/                 # /drills + /drills/[id]
│   ├── profile/                # /profile + /profile/[username]
│   ├── leaderboard/
│   ├── insights/
│   ├── sign-in/ sign-up/       # Clerk catch-alls
│   ├── about/ blog/ changelog/ privacy/ terms/   # static marketing
│   ├── appearance-applier.tsx  # mirrors appearance prefs → html data attrs
│   ├── borders-applier.tsx     # mirrors borders pref → html data attr
│   ├── background-applier.tsx  # mirrors background image → CSS vars
│   ├── focus-shortcut.tsx      # global F / Esc
│   └── providers.tsx           # ThemeProvider → PaletteProvider → tooltip
├── components/
│   ├── ui/                     # shadcn primitives
│   └── ft/                     # flinttype design-system primitives
├── server/
│   ├── router.ts               # root namespace
│   ├── routes/<ns>/            # one folder per namespace
│   ├── middleware/             # logging, auth, rate-limit
│   ├── race/                   # in-memory room engine
│   ├── pipeline.ts / resolve.ts / dispatcher
│   ├── logger.ts, env.ts, errors.ts, testing.ts
│   └── ensure-user.ts
├── db/
│   ├── schema/<table>.ts       # shared schema
│   ├── server/repositories/    # one file per table
│   └── migrations/server/      # drizzle-kit output
├── lib/                        # client + isomorphic helpers
│   ├── backend.ts              # useBackend() Proxy
│   ├── safe.ts                 # Result wrapper
│   ├── errors.ts               # BackendError (isomorphic)
│   ├── themes/                 # registry, presets, background-reactive
│   ├── theme-customization.ts  # per-var overrides
│   ├── appearance-prefs.ts     # the 47-field surface
│   ├── caret-settings.ts, keyboard-settings.ts, background-prefs.ts,
│   │   behaviour-prefs.ts, multiplayer-prefs.ts, ...
│   ├── prefs-store.ts          # localStorage + debounced server sync
│   ├── use-remote-prefs.ts     # subscribe-and-merge hook
│   ├── wpm.ts                  # WPM / accuracy maths
│   ├── use-adapt.ts            # adaptive prefetch queue
│   └── quotes.ts               # quote group catalog
├── types/                      # route I/O, domain models, Zod schemas
└── proxy.ts                    # Clerk middleware
docs/
├── backend-rules.md            # the 12 rules + middleware + errors + logging
├── ui-law.md                   # the design system
├── organization.md             # file-length thresholds + decision table
├── seo.md                      # 9 SEO rules + per-page template
├── auth.md                     # Clerk wiring + middleware + tests
└── database.md                 # Drizzle layer rules
scripts/                        # tsx + node scripts (themes:add, fonts:download, ...)
```

---

## 12. Build, dev, ops

### 12.1 Yarn scripts
| Script | Purpose |
|---|---|
| `yarn dev` | Next.js dev server (Turbopack) |
| `yarn build` | Production build |
| `yarn start` | Run built server |
| `yarn lint` | ESLint |
| `yarn test` | Vitest run once |
| `yarn test:watch` | Vitest watch |
| `yarn db:generate` | Drizzle codegen (read schema → write SQL migration) |
| `yarn db:migrate` | Apply pending migrations |
| `yarn db:push` | Apply schema to DB without migration file (dev only) |
| `yarn db:studio` | Drizzle Studio web UI |
| `yarn themes:add <url>` | Pull a tweakcn theme + register |
| `yarn themes:remove <id>` | Remove a theme |
| `yarn fonts:download` | Fetch font files |
| `yarn announce` | Send announcement to every user |
| `yarn backfill-og` | Bulk-grant OG to eligible old users |

### 12.2 Environment
Two-file split:
- `.env` — committed defaults (`APP_ENV`, `LOG_ENABLED`, `LOG_LEVEL`, `DATABASE_MODE`, `PGLITE_DATA_DIR`, Clerk redirect URLs).
- `.env.local` — gitignored secrets (`DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `TWENTYFIRST_API_KEY`, `OPENROUTER_API_KEY` if used, etc.).

Parsed and validated by `src/server/env.ts`. The same module refuses to boot with `APP_ENV=development` when running on Vercel or CI — a belt-and-braces guard against shipping dev-mode admin bypasses.

### 12.3 Deployment
- Vercel for the Next.js app.
- Neon Postgres via Vercel Storage; `DATABASE_URL` auto-injected to every environment.
- Clerk hosted; keyless mode used during local dev when no keys are present.
- Single Vercel function serves the dispatcher (good fit for the HTTP Neon driver — no connection pooling required).

### 12.4 Commit discipline
- Conventional Commits: `type(scope): title` where `type ∈ {feat, fix, chore, docs, refactor, test, build, style}`.
- Body line 1 is the version from `VERSION`. Patch by default; minor for user-facing features; major for breaking.
- `VERSION` (canonical plain text) and `package.json#version` must match on every commit.
- No AI / Claude attribution in commit messages. No `Co-Authored-By: Claude` footer.
- One logical change per commit; don't bundle unrelated work.
- Every backend addition ships with its co-located `*.test.ts` in the same commit (R12).

### 12.5 Testing
- 481 tests in 55 files at version 6.38.3, all in Vitest.
- Driven via `callRoute()` from `@/server/testing` — runs the full middleware stack in-process, no HTTP.
- Coverage of routes is mandated by R8: happy path, Zod failure, auth failure, domain errors.
- Frontend components are not unit-tested — verified manually in the browser at 375 px and ≥ 1024 px per `docs/ui-law.md §10.3`.

---

## 13. Differentiation from comparable products

- **Editorial-mechanical aesthetic** — paper and ink, hairline borders, single coral accent, JetBrains Mono everywhere by default. The user can dial all the way down to a stripped Monkeytype-style view with one preset click, or build something in between with 47 independent knobs.
- **Server-owned typing models** — per-user bigram / trigram / word / motor-feature statistics persisted to Postgres, used by the adaptive engine and the drills. Welford incremental updates so writes are O(1) per keystroke event.
- **Hierarchical Zod-validated backend** with a recursive `Proxy` client — no codegen, no tRPC, no GraphQL; renaming a server route breaks the client at compile time.
- **Documentation as load-bearing artifact** — `docs/ui-law.md`, `docs/backend-rules.md`, `docs/organization.md`, `docs/seo.md`, `docs/auth.md`, `docs/database.md` are all `@`-referenced from `CLAUDE.md`. New patterns get added to the doc *first*, in the same commit as the code using them. The doc leads; the code follows.
- **MonkeyType compatibility** — users with an Ape Key can import their MT account; the Stripped Surface preset deliberately bundles ten knobs that compose to a Monkeytype-leaning view so the transition feels familiar.

---

## 14. What isn't built yet

This is a snapshot at 6.38.3, not a target state. Known gaps:

- No PWA / offline mode.
- No spectator mode for races beyond the host-side challenge lobby.
- No team / club / classroom features.
- Adaptive engine is per-user only — no shared models, no cross-user difficulty seeding.
- Insights dashboard is exploratory; no exports / pivot tools yet.
- Webhooks from Clerk are not wired — `users` mirror updates lazily via `ensureUser()` on the next authenticated request. Email / name / role changes can lag until the user touches the app; deletes leak rows.
- Rate limiter is in-memory; a multi-instance deploy needs a Redis-backed swap (single-file change documented in `docs/backend-rules.md`).

---

*Last regenerated against repository state at 6.38.3. The authoritative source for every claim above is the docs in `docs/` and the code itself; if this file and the code disagree, the code wins.*
