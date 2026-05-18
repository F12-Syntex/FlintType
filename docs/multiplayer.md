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
