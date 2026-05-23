# Handoff — unify races onto a single "lobby" model

> Working doc for a fresh session. Read `CLAUDE.md` + the `docs/*` rules first (they're authoritative and auto-loaded). This file is the project-specific state and plan. Delete it when the work lands.

## Goal (one line)

Finish migrating multiplayer to **one concept: lobbies**. Remove the old "duel" and "challenge" terminology/flows. Two lobby kinds:

- **Public lobby** — server-managed (today's matchmaking). "Find race" / a normal race joins the most-available public lobby, or the server spins one up. **Clients can NEVER create public lobbies** (server-only).
- **Private lobby** — created when you race a friend; the friend gets an **in-app notification** with a Join button.

The whole thing must be **heavily E2E-tested** (user's explicit requirement).

## Locked design decisions (from the user — don't re-litigate)

1. Centralise everything to lobbies. Public lobby = server creates/joins; private lobby = friend invite.
2. Friend invite = **in-app notification** (not a shared link). DONE (Phase 2).
3. **Remove async ghost duels completely**, including dropping the `duels` DB table.
4. Heavily tested, end to end.

## Already done — DO NOT REDO

These are committed and green (current version `6.108.x`, `yarn test` = 824 passing, `tsc` clean, 6 Playwright E2E passing):

- **Phase 2 (friend → live lobby + invite)** — commit `feat(lobby): race a friend via a live lobby + in-app invite`:
  - `race_invite` notification kind + `RaceInviteData` in `src/types/notification.ts`.
  - `lobby.invite` route: `src/server/routes/lobby/index.ts` (+ `index.test.ts`), types in `src/types/lobby.ts`, registered in `src/server/router.ts`. Auth'd, mutual-friend + block gated, deduped per `(slug, recipient)`.
  - Client orchestration helper `src/lib/invite-to-lobby.ts` (`createLobbyAndInvite`): creates the private room via `race.challenge.create` (proxied to the authority), stashes host storage, then calls `lobby.invite`. Room creation (authority) and the friend graph (app DB) live in different places — that's why it's two calls.
  - `src/components/invite-to-race-button.tsx` ("Race" button) used on the profile hero; the follow-button menu item is now "Invite to a race". `src/app/_components/notifications-popover.tsx` renders `race_invite` with a Join deep-link to `/race/c/<slug>`.
- Earlier this session (also committed): race countdown input-lock gap fix (`src/lib/race-input.ts`, `src/app/race/_components/race-online.tsx`), tape restart-centering, tape fade option, centered passage + smaller keyboard defaults, Playwright E2E harness (`playwright.config.ts`, `e2e/`).

**Net state:** the friend-lobby flow is live. Async duels still exist as a harmless fallback until Phase 3 removes them.

## What's left

### Phase 3 — Remove async duels (the big deletion)
- Delete pages: `src/app/duel/[id]/`, `src/app/duel/new/`, `src/app/duels/` (+ their `_components/`: `duel-view.tsx`, `duel-new-view.tsx`, `duel-outcome.tsx`, `words.ts`, `duels-view.tsx`).
- Delete backend: `src/server/routes/duels/` (whole dir), and remove `duels` from `src/server/router.ts`.
- Delete repo: `src/db/server/repositories/duels.ts` (+ `.test.ts`), and remove `duels` from the `Database` type + `createDatabase()` in `src/db/server/index.ts`.
- Delete schema `src/db/schema/server/duels.ts`, `src/types/duel.ts`.
- **Drop the table:** after deleting the schema, run `yarn db:generate` to emit a drop migration into `src/db/migrations/server/` (commit the generated SQL — D8). Don't hand-edit migrations.
- Notifications: remove `duel_challenge` / `duel_result` from `NotificationKind` + `DuelChallengeData`/`DuelResultData` in `src/types/notification.ts`; remove `isDuelNotification` + its href arm in `src/app/_components/notifications-popover.tsx`.
- Friends dock: `src/components/friends-dock/use-dock-data.ts` polls `duels.list()` for the "challenges" badge — repoint to pending `race_invite` notifications (or remove the badge). `src/components/friends-dock/index.tsx` renders the Swords/challenge count; `HIDDEN_PREFIXES` includes `/duel` (drop it).
- Docs: strip duel sections from `docs/friends.md` (step 7 "Async ghost duels") and `docs/ui-law.md` §17.5 (the "challenges are pending-only … live on /duels" wording).
- Remove duel tests.

### Phase 4 — Public-lobby reframe
- Entry: `src/app/race/_components/race-shell.tsx` + `race-controls.tsx`. "Find race" → `race.queue` already joins/creates a server-side matchmaking room — that IS the public lobby. Confirm clients can't create public lobbies (they can't: `queue` takes only `modeId`). Rename UI copy "challenge"/"matchmaking" → "lobby".
- Backend: `src/server/routes/race/index.ts` (`queue`), `src/server/routes/race/challenge.ts` (private lobby create/join/start/cancel). `src/server/race/store.ts` (`joinOrCreateMatchmaking`, `createChallengeRoom`), `src/server/race/room.ts` + `src/types/race.ts` `RaceRoomKind = "matchmaking" | "challenge"`.
- **Optional internal rename** (tidy-up, not blocking): `RaceRoomKind` → `"public" | "private"`, `challenge.*` routes → `lobby.*`, `/race/c/[slug]` → a lobby URL. Phase 2 was built on the existing challenge infra without renaming, so this is cosmetic. tsc + tests are the safety net.
- Docs: `docs/multiplayer.md`.

### Phase 5 — Heavy E2E (`e2e/`, Playwright)
- Public lobby: Find race → joins/creates, races to finish.
- Private lobby: user A creates (Race-a-friend) → user B gets the `race_invite` notification → clicks Join → both in the lobby. (Two browser contexts; seed mutual-follow + auth, or test the notification render + join-link navigation.)
- Confirm race-start input gating still holds (existing `e2e/race-countdown.spec.ts` pattern).

## Conventions / gotchas (read before coding)

- **Commit protocol (CLAUDE.md):** every turn that changes files → commit before yielding. Bump `VERSION` **and** `package.json` `version` (must match), add a top entry to `public/CHANGELOG.md` (plain user-facing language; "Internal changes only." for non-user changes). Conventional Commits: `type(scope): subject`, body line 1 = version. **Never** add any AI/Claude attribution. One logical change per commit; stage only your files (no `git add -A`).
- **Package manager:** yarn classic only. Never npm. There must be no `package-lock.json`.
- **Verify gates:** `yarn test` (vitest) + `yarn tsc --noEmit` must be green. Backend code ships with co-located `*.test.ts` in the same commit (backend-rules R8/R12). React components are tested in-browser, not unit-tested (ui-law §1.3) — cover them with E2E instead.
- **E2E:** `yarn e2e` (Playwright, headless, own dev server on port **3100**). **Gotcha:** Next 16 allows only ONE `next dev` per project dir — kill any stray flinttype dev server first or `yarn e2e`'s webServer fails ("Another next dev server is already running"). PowerShell: `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? { $_.CommandLine -match 'next' -and $_.CommandLine -match 'flinttype' } | % { Stop-Process -Id $_.ProcessId -Force }`.
- **Race authority/proxy split (`docs/multiplayer.md`):** race routes are proxied to a separate authority process (in-memory room store); the app DB (notifications, follows, blocks) is on the main app. That's why `lobby.invite` is a separate main-app route from the proxied `race.challenge.create`, and the client orchestrates both.
- **UI work:** invoke the `impeccable` skill BEFORE writing/editing UI (CLAUDE.md mandate). `docs/ui-law.md` is authoritative; mobile-first; lobby UI is **product register** (earned familiarity, no invented affordances). Any new pattern → amend `docs/ui-law.md` in the same commit.
- **Backend rules:** types in `src/types/<domain>.ts`; `defineRoute<I,O>` with explicit generics; Zod on every input; errors via `BackendError(status, code, …)`; routes are top-level consts (R11).
- **Don't touch infra/config** (`next.config.ts`, `tsconfig`, `eslint`, `drizzle.config`, etc.) unless explicitly asked. The one sanctioned `package.json` change beyond `version` already happened (Playwright devDep + `e2e` scripts).

## Quick verify after each phase

```
yarn tsc --noEmit
yarn test
yarn e2e          # kill stray flinttype `next dev` first
```
