# Multiplayer (race subsystem)

Race state — matchmaking rooms, challenge rooms, bot tick loops, racer progress, the SSE broadcast — lives in an **in-memory** store (`src/server/race/store.ts`). One process owns the truth. To make that work safely behind a serverless front end, the deployment is split:

| Role | Where it runs | Env shape |
|---|---|---|
| **Authority** | Single warm Node process (Railway Hobby). One instance, ever. | `RACE_AUTHORITY=true`, `RACE_PROXY_SECRET=<shared>` |
| **Proxy / front door** | Vercel — the rest of the app. Handles every non-race request directly; race POSTs are forwarded server-to-server to the authority. | `RACE_AUTHORITY=false`, `RACE_SERVICE_URL=https://race.flinttype.com`, `RACE_PROXY_SECRET=<shared>`, `NEXT_PUBLIC_RACE_SERVICE_URL=https://race.flinttype.com` |
| **Local dev** | Single `next dev` process. No proxy. | Defaults — every var unset; behaves identically to a single-process deploy. |

This shape is the cheap solution to "two Vercel function instances both create a matchmaking room for the same mode" — there's exactly one process holding the `Map`, so the race condition cannot exist.

## Wire diagram

```
Browser ──POST /api/race/*──> Vercel (Next.js) ──fetch──> Railway (race authority)
Browser ──EventSource──────────────────────────────────────> Railway (SSE direct)
Browser ──everything else───> Vercel
```

- **Race POSTs** go to Vercel like every other API call. The `raceHandler` wrapper sees `RACE_AUTHORITY=false`, calls `proxyToRaceAuthority(ctx)`, and forwards the exact same JSON body to `${RACE_SERVICE_URL}${pathname}` with two extra headers: `x-flinttype-race-secret` (auth) and `x-forwarded-for` (preserves real client IP so per-user rate-limit buckets stay accurate).
- **SSE** goes browser → Railway directly. The client reads `NEXT_PUBLIC_RACE_SERVICE_URL` from the build and constructs the EventSource URL against the authority origin. The SSE route ships `Access-Control-Allow-Origin: *` so cross-origin handshake works; no cookies, no credentials.
- **The unload beacon** (`navigator.sendBeacon('/api/race/leave', …)`) stays on Vercel — `sendBeacon` cannot do cross-origin JSON without a preflight, so it hits Vercel, where the proxy wrapper forwards it to Railway like any other POST.

## Why a shared secret

The authority instance is publicly reachable at `race.flinttype.com`. Without auth, anyone could hit `/api/race/queue` directly and queue racers into matchmaking — circumventing Vercel's edge protections. The secret locks Railway down:

- **Authority side** (`requireRaceProxySecret` in `src/server/race/proxy.ts`): if `RACE_PROXY_SECRET` is set, every race request **must** carry a matching `x-flinttype-race-secret`. Anything else → 401.
- **Proxy side**: every forwarded request includes the header automatically.
- **Local dev**: `RACE_PROXY_SECRET` is unset on both sides → middleware is a no-op → workflow unchanged.

Generate the secret with `openssl rand -hex 32` and set the exact same value in:
- Railway env vars (authority side)
- Vercel env vars (proxy side)

The SSE route does **not** check the secret — it only reads room snapshots (no writes), and the `(roomId, sessionToken)` pair in the URL is the existing authority model. Adding cookie-equivalent auth to a cross-origin EventSource would mean configuring credentials on both sides for marginal benefit.

## How the proxy preserves request shape

`useBackend().race.queue(input)` on the client is unchanged. The client never knows the proxy exists:

1. Client `POST /api/race/queue` with body `{modeId: "words"}`.
2. Vercel dispatcher resolves to the `queue` route, runs the rate-limit middleware (per-real-IP, since the dispatcher trusts Vercel's `x-forwarded-for`), then calls the handler.
3. Handler is wrapped in `raceHandler(...)` — it sees `IS_RACE_AUTHORITY=false` and calls `proxyToRaceAuthority(ctx)`.
4. Proxy POSTs `https://race.flinttype.com/api/race/queue` with the same body, adds `x-flinttype-race-secret` + `x-forwarded-for: <client IP>`.
5. Railway's dispatcher receives the request, runs the SAME rate-limit middleware (per-real-IP via the forwarded header, so the limit composes correctly), then the SAME handler. This time `IS_RACE_AUTHORITY=true` so it runs the local store logic and returns the room snapshot.
6. The proxy receives the JSON, returns it from the Vercel handler, dispatcher serializes it back to the client.
7. Errors: a `BackendError` thrown on Railway is serialized as JSON, the proxy reconstructs it as a `BackendError` of the same shape and re-throws — client `useBackend()` catches the original error class. The fact there were two hops is invisible.

## Deployment

**One-time Railway setup:**

1. Create a new project from the same GitHub repo.
2. Set env vars (Railway dashboard → Variables):
   - Everything you already have on Vercel (Clerk keys, `DATABASE_URL`, `OPENROUTER_API_KEY`, `API_KEY_ENC_SECRET`).
   - `RACE_AUTHORITY=true`
   - `RACE_PROXY_SECRET=<openssl rand -hex 32>`
3. Add a custom domain: `race.flinttype.com` → Railway gives you a CNAME target. Set the CNAME in your DNS.
4. Deploy. Railway auto-detects Next.js, no Dockerfile needed.

**One-time Vercel setup** (alongside your existing prod env):

- `RACE_AUTHORITY=false`
- `RACE_SERVICE_URL=https://race.flinttype.com`
- `RACE_PROXY_SECRET=<same value as Railway>`
- `NEXT_PUBLIC_RACE_SERVICE_URL=https://race.flinttype.com`

Redeploy Vercel after setting `NEXT_PUBLIC_RACE_SERVICE_URL` — it's a build-time inline.

**To back out** (e.g. Railway down): set Vercel's `RACE_AUTHORITY=true` and `RACE_SERVICE_URL=""`, redeploy. The single-Vercel-instance behaviour returns instantly (with the original cross-instance race-condition risk back, but everything still works).

## What is NOT covered by this split

- **Race state still vanishes on Railway restart.** A deploy or crash wipes every live room. Acceptable: race rooms are ephemeral and clients reconnect/requeue.
- **Single point of failure.** Railway down = no multiplayer. Rest of the app keeps serving from Vercel.
- **No horizontal scaling of the authority.** One instance is the whole point. If race traffic grows past one process, the next step is per-mode sharding (room-id-prefix → instance) or moving to Cloudflare Durable Objects.

## Live solo-practice spectate

Watching a friend type live (`/live` broadcaster, `/live/<userId>` spectator) is **separate from the race rooms** and, in v1, does **not** run on the authority:

- **Live-session store is DB-backed** (`live_sessions` table, migration `0011`; `liveSessionsRepo`), exactly like presence — one row per broadcaster, upserted ~every 700ms. Chosen over an in-memory authority map because a live session keys on the authenticated Clerk userId (which the authority can't see) and a shared table is **correct across Vercel instances**: a spectator poll routed to a different instance than the broadcaster's push still finds the snapshot. A snapshot is "live" only while fresh (`LIVE_TTL_MS`, 6s); a broadcaster that stops pushing ages out at read time with no goodbye.
- **Consent + gating** — sharing is **on by default** (`spectate.enabled !== false`); a global Off stops all broadcasting and a per-friend `spectate.blocked` denylist excludes named viewers. Spectating requires the viewer be a **mutual friend**, unblocked, sharing not off, and not on the denylist. `live.watch` returns `{ live: false }` for every disallowed case so nothing leaks. Backend-enforced, not just client-gated. `live_spectators` (migration `0012`) records who's watching so the broadcaster sees a live spectator count.

### Transport: v1 polling, SSE + direct-write is the planned upgrade

The agreed end-state is **direct browser→authority** streaming: the broadcaster POSTs progress straight to the Railway origin (`NEXT_PUBLIC_RACE_SERVICE_URL`) at ~10 Hz authed by a per-session **capability token** (issued on session start, like the race `sessionToken`, CORS-enabled — *not* the server-only `RACE_PROXY_SECRET`), and the spectator subscribes via an SSE route (`/api/live/stream/<userId>`) browser→authority direct, mirroring `/api/race/stream/[roomId]`. The live state would then move from the `live_sessions` table to an in-process map on the authority. This keeps the high-frequency stream off Vercel function-invocation/CPU meters and minimises latency. It also wants a **lazy** control channel so the broadcaster only streams while a spectator is attached.

**v1 ships polling instead**, deliberately: the broadcaster pushes `live.progress` and the spectator polls `live.watch` every ~700ms through the normal backend (≈1.4 req/s each — modest), against the DB-backed store. This gives sub-second "live-ish" spectating with zero new transport surface (no bespoke SSE route, no CORS, no capability tokens) and is correct on a multi-instance deploy. The consent model + UI are transport-agnostic, so the SSE + direct-write upgrade is a swap behind the same `live.*` surface when the traffic justifies it. When that lands, document the capability-token issuance, the `/api/live/stream/<userId>` SSE route, the lazy control channel, and the direct-write CORS posture (mirror the SSE route's `Access-Control-Allow-Origin: *`) here.

- **Cost of v1:** the ~700ms upsert is one row write per active broadcaster (rare — only opted-in users on `/live`), and the spectator poll is one indexed read per active viewer. Fine at the current scale; the SSE upgrade removes both meters when it's worth it.
