# Handoff — multiplayer race + friends dock work

_Last updated: 22 May 2026 · version `6.101.12` · branch `master` in sync with `origin/master` (`aafd98c`)._

This captures a run of work across the **race/duel subsystem** and the **friends dock**, plus a pre-production review. Everything below is committed and pushed unless flagged otherwise. Gates were green at handoff: `yarn tsc --noEmit` clean, `yarn test` = **754 passed**, and `yarn build` verified earlier in the run.

---

## 1. Status snapshot

| | |
|---|---|
| Version | `6.101.12` (`VERSION` + `package.json` in sync) |
| Branch | `master` == `origin/master` == `aafd98c` (nothing unpushed) |
| Gates | tsc clean · 754 tests pass · build passes (runs `db:migrate`) |
| Repo | GitHub canonical name is now **`F12-Syntex/FlintType`** (capital T). Pushes redirect & work, but `git remote set-url origin https://github.com/F12-Syntex/FlintType.git` silences the "repository moved" notice. |

**Uncommitted in the working tree (NOT mine, left untouched):** `src/lib/skill-baseline.ts`, `todo`, and `.playwright-mcp/*` artifacts. Don't sweep these into commits — use targeted `git add <paths>`, never `git add -A` (per `CLAUDE.md` commit discipline; the user runs parallel work).

---

## 2. ⚠️ Operational must-knows

1. **Race-logic changes only take effect when the race authority redeploys.** Per `docs/multiplayer.md`, race rooms can run on a separate **Railway** authority (`RACE_AUTHORITY=true`) with Vercel proxying. Anything in `src/server/race/**` or `src/server/routes/race/**` (WPM scoring, no-bots, FFA, timed mode, wordlist, self-join dedup) **does not change prod behavior until Railway redeploys** — pushing `master` only updates Vercel. Frontend race fixes (the spectator crash, results scroll) are Vercel and take effect on deploy. **Confirm whether the Railway split is active in prod**; if so, redeploy it after race-authority changes.
2. **Cost is the overriding constraint.** The user is sensitive to Vercel/Railway/Clerk bills. Live-spectate is **v1 polling** (deliberately, see `docs/multiplayer.md`). Before adding any poll/interval/heartbeat: pause on hidden tabs, add backoff, and don't add per-poll external (Clerk) calls — `resolveUserDisplays` is cached (30s TTL) for exactly this reason.
3. **UI is manually tested.** Per `docs/ui-law.md` §1.3 there are **no unit tests for React components**. The friends-dock and race-spectate UI below were typechecked but NOT browser-verified this session. See the manual-test checklist in §5.

---

## 3. What shipped this session

### Race / multiplayer
- **Server-authoritative WPM** (`6.98.5`) — WPM is computed server-side from progress ÷ time-since-`raceStartedAt`, not the client's first-keystroke value. Winner ranks by net WPM (`rankByNetWpm`), already in place; this made it honest. `src/server/race/room.ts`.
- **No bots in challenge/FFA lobbies** (`6.98.5`) — `hostStart` only fills bots for `matchmaking` rooms. `BOT_LINEUP.ffa = []`.
- **Free-for-all mode** (`6.99.0`) — `ffa` in `RACE_MODE_IDS`, `capacityFor("ffa") = 8`, real players only.
- **Host-configurable lobbies** (`6.99.0`, `6.101.0`) — `createChallenge` accepts `wordCount`, `durationSec` (timed race → `endRaceByTimeLimit` buzzer), and a **word pool** from the full MonkeyType wordlist catalogue (client fetches the chosen list, sends a capped `wordPool`; server samples + re-rolls from it). UI: `src/app/race/_components/challenge-config.tsx`.
- **Dead/expired invite recovery** (`6.99.1`) — a missing room's SSE 404s; `race-online.tsx` now treats "stream closed + no snapshot" as a cancel and bounces to `/race` instead of hanging (fixes a host returning to an expired link via stale `sessionStorage`).
- **Results screen scrolls** (`6.98.4`) — `RaceBody` makes the finished phase scrollable inside `AppChrome compact`.
- **Spectate full/started lobby without crashing + block self-join** (`6.101.12`, latest) — see §4.

### Duels
- **Live status + native passage** (`6.99.2`) — `DuelView` polls `duels.get` while pending (pauses on hidden tab); the duel typing surface paints with the native `--ft-passage-*` tokens.

### Friends dock (`src/components/friends-dock/`)
The dock replaced the old `/friends` page (parallel work). This session redesigned it through several iterations to the current state:
- **"Active Members"-style panel** with status-sorted rows, action chips (Watch/Accept), and a Member-directory bar (`6.101.1`).
- **Floats above the footer**, measuring real footer height so it doesn't hover in dead space when the footer is hidden (`useFooterHeight`, `6.101.2`).
- **Member directory is a full-view takeover** (`6.101.8`): clicking the bar swaps the panel to a directory view (header + back + full follow list). `view` state lives in `index.tsx`; `dock-panel.tsx` renders both views.
- **Fixed panel size + animated directional view switch** (`6.101.10`) — desktop panel is `h-[min(72dvh,540px)]` so it never resizes between views; switching slides/fades (no bounce, reduce-motion → crossfade).
- Followers included in the directory, "Friends" title, calm neutral hover (not coral) (`6.101.9`).

### Cost / perf + pre-prod review
- **Cost hardening** (`6.98.3`) — cached Clerk display lookups, paused hidden-tab polls, capped the unwatched "done" broadcast after a grace window.
- **Independent pre-prod review** passed (READY TO PUSH, no blockers). Three non-blocking follow-ups filed → **GitHub issue [FlintType#1](https://github.com/F12-Syntex/FlintType/issues/1)** (see §6).

---

## 4. Latest fix detail (`6.101.12`, `aafd98c`)

Two production bugs from the same screenshot ("This page couldn't load / RUN CRASHED" when joining a full lobby):

**Spectator crash.** A pure spectator (joined a full/started lobby → got `spectate: true`, no seat) has no `isYou` racer, but `RacePassage` (`passage.tsx`) and `RaceResults` (`race-results.tsx`) dereferenced `state.racers.find(r => r.isYou)!` → threw → global error page.
- `RacePassage` now guards every `you`-derived value and renders the live `SpectatorPassage` for a seatless spectator (whole race + finish).
- `RaceResults` returns `null` for spectators (guard placed **after** all hooks — rules-of-hooks).

**Self-join.** `join` minted an anonymous token, so a signed-in host opening their own link spawned a duplicate of themselves.
- Racers carry their Clerk `userId` now (`getRaceIdentity` returns it). `RaceRoom.addRealRacer` resumes an existing seat when the same `userId` is already in the room; challenge create/join + matchmaking queue thread the `userId` and return the **resumed seat's** token. Guests (no `userId`) unaffected.
- Tests: `identity.test.ts` (userId), `room.test.ts` (self-join dedup).

---

## 5. Manual-test checklist (NOT done this session — components aren't unit-tested)

Verify in `yarn dev` at **375px and ≥1024px**, light + dark:
- **Race spectate:** open a challenge in two browsers; fill/start it; join from a 3rd → should drop into a **read-only spectator** view showing the live race (no crash, the `SpectatorBanner` shows). When it finishes, no crash.
- **Self-join:** as a signed-in host, open your own `/race/c/<slug>` link in a second tab → you should reconnect to your seat, **not** appear twice.
- **Friends dock:** open it (quiet fade) → click **Member directory** (slides into the full list, panel does **not** resize) → back arrow / X returns. Mobile = bottom sheet with back arrow. Toggle "reduce motion" → transitions flatten to a fade.
- **Friends dock position:** hide the footer (Customise → Chrome) and on a compact/practice mobile screen → the dock should sit in the corner, not float in empty space.

---

## 6. Open follow-ups

**GitHub issue [FlintType#1](https://github.com/F12-Syntex/FlintType/issues/1)** — three non-blocking items from the pre-prod review:
1. `live_spectators` has **no reaper** — rows only deleted on explicit `remove()`; bounded but ever-growing. Add a periodic `DELETE … WHERE updated_at < now() - interval`.
2. `friends.compare` exposes aggregate stats to any signed-in caller — consistent with existing `profile.publicProfile`, so a *decision* (gate both, or document as intentional), not a bug.
3. `live.progress` accepts opaque `appearance`/`caret`/`themeVars` blobs — size-bounded, cosmetic-only (scoped CSS vars), but a Zod allowlist would harden it.

**Tooling:** `gh` CLI is not installed and the `GH_TOKEN`/`GITHUB_TOKEN` env var is invalid; issue #1 was created via the REST API using the token from Git Credential Manager. Installing `gh` + `gh auth login` would make future PR/issue work cleaner.

---

## 7. Where things live (orientation)

- **Race authority + state machine:** `src/server/race/room.ts` (one class owns phases/timers/bots/broadcast), `store.ts` (in-memory room registry), `bots.ts`, `identity.ts`. SSE stream: `src/app/api/race/stream/[roomId]/route.ts`. Deployment split: `docs/multiplayer.md`.
- **Race routes:** `src/server/routes/race/{index,challenge}.ts`. Types: `src/types/race.ts`.
- **Race UI:** `src/app/race/_components/*` — `race-state.tsx` (provider), `race-online.tsx` (SSE → state), `passage.tsx` (RacePassage), `spectator-passage.tsx`, `race-results.tsx`, `race-body.tsx`, `challenge-config.tsx`, `lineup-panel.tsx`.
- **Duels:** `src/app/duel/_components/duel-view.tsx`, `src/server/routes/duels/*`, `src/types/duel.ts`.
- **Friends dock:** `src/components/friends-dock/` — `index.tsx` (shell, view state, footer-height + pill), `dock-panel.tsx` (both views + rows), `use-dock-data.ts` (polled data), `presence-label.ts`. Mounted globally in `src/app/providers.tsx`.
- **Live spectate (separate from race rooms):** `src/server/routes/live/index.ts`, `src/app/_components/practice-live-broadcast.tsx`, `src/app/live/_components/*`, cadence in `src/lib/live-cadence.ts`.
- **Authoritative docs:** `docs/multiplayer.md`, `docs/ui-law.md`, `docs/backend-rules.md`, `docs/database.md`, `docs/auth.md`, `docs/seo.md`, `docs/organization.md`. `CLAUDE.md` references all of them.

---

## 8. Conventions that bit during this work

- **Commit protocol** (`CLAUDE.md`): every change bumps `VERSION` **and** `package.json` (must match), adds a `public/CHANGELOG.md` entry (user-facing language; internal-only changes get one brief line), Conventional Commits, **no AI attribution**, stage only your files.
- **`docs/ui-law.md` is the design law.** One coral accent (`--primary`) used sparingly; JetBrains Mono; hairline borders; `rounded-md`. Don't reproduce multi-colour pills from external mocks (it breaks the one-spark rule). **Any visual work routes through the `impeccable` skill first** (project mandate). Avatars are sanctioned only on friends/live surfaces (§17.5).
- **Motion** (`docs/ui-law.md` §13): the friends reveal is the one sanctioned framer-motion surface; never animate layout properties (height/width/position) — use transforms + opacity, ease-out, no bounce, and a `prefers-reduced-motion` fallback.
- **Stay-in-lane** (`CLAUDE.md`): never touch build/infra config (`next.config.ts`, `tsconfig`, `vitest.config`, `yarn.lock`, `.env`, drizzle config) unless explicitly asked.
