import { NextResponse, type NextRequest } from "next/server";
import { IS_RACE_AUTHORITY } from "@/server/env";
import { acquireSseSlot } from "@/server/race/sse-limit";
import { getRoom } from "@/server/race/store";

/** SSE stream of room snapshots. The dispatcher in
 *  `src/app/api/[...path]/route.ts` is JSON-POST only, so the stream
 *  lives at its own route file.
 *
 *  Wire format: one `data: <json>\n\n` block per snapshot. The room
 *  module already throttles broadcasts to ~12 Hz, so the byte rate
 *  stays cheap even at peak. A heartbeat comment line every 15s
 *  keeps long-idle proxies from severing the connection.
 *
 *  Disconnect cleanup: we unsubscribe + clear the heartbeat when the
 *  client closes the EventSource. We do NOT auto-leave the room on
 *  disconnect — the client posts `race.leave` explicitly on unmount
 *  so a refresh isn't treated as a quit.
 *
 *  Runtime: `nodejs`. Edge would also work but `setInterval` lives
 *  cleaner on Node and the existing race-room module is Node-native
 *  (crypto.randomBytes, setTimeout).
 *
 *  Region pinning: only meaningful when this instance also hosts the
 *  room store (i.e. RACE_AUTHORITY=true). On the Railway authority
 *  there's a single warm process so region is moot; on a Vercel
 *  non-authority deploy, the route 410s and the client connects to
 *  NEXT_PUBLIC_RACE_SERVICE_URL directly. The pin is harmless in
 *  either case so it stays declared. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

/** Cross-origin CORS for the SSE handshake. The browser opens
 *  EventSource against `${NEXT_PUBLIC_RACE_SERVICE_URL}/...` which is
 *  a different origin from the main app on Vercel; without these the
 *  fetch is blocked by the browser. SSE has no cookie auth in this
 *  app (the (roomId, sessionToken) pair is the authority), so a
 *  wildcard origin is safe — no `Allow-Credentials`. */
const SSE_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: SSE_CORS_HEADERS });
}

/** Read the caller IP the same way `rateLimit` does — x-forwarded-for
 *  first (the proxy chain stamps the real client IP first), then
 *  x-real-ip, then a shared `anon` bucket as a last resort. The
 *  shared bucket means an entirely-misconfigured deployment fails
 *  closed (everyone shares one per-IP cap) rather than open. */
function callerIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anon";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  const { roomId } = await params;
  if (!IS_RACE_AUTHORITY) {
    // Non-authority instance never holds rooms. Returning a clear 410
    // (instead of 404) makes a misconfigured deploy obvious — the
    // client must use NEXT_PUBLIC_RACE_SERVICE_URL to reach the
    // authority directly.
    return NextResponse.json(
      {
        error:
          "this instance is not the race authority — connect EventSource to NEXT_PUBLIC_RACE_SERVICE_URL instead",
        code: "INTERNAL",
        status: 410,
      },
      { status: 410, headers: SSE_CORS_HEADERS },
    );
  }
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json(
      { error: `race room "${roomId}" not found`, code: "NOT_FOUND", status: 404 },
      { status: 404, headers: SSE_CORS_HEADERS },
    );
  }

  // Acquire a connection slot BEFORE binding the room subscriber or
  // opening the stream. Past either ceiling we 429 (per-IP) or 503
  // (global) with a clear retry hint — the EventSource client will
  // back off and retry automatically.
  const slot = acquireSseSlot(callerIp(req));
  if (!slot.ok) {
    if (slot.reason === "per-ip") {
      return NextResponse.json(
        {
          error: `too many concurrent connections from this IP (cap ${slot.cap})`,
          code: "RATE_LIMITED",
          status: 429,
          details: { ip: slot.ip, count: slot.count, cap: slot.cap },
        },
        { status: 429, headers: SSE_CORS_HEADERS },
      );
    }
    return NextResponse.json(
      {
        error: `race service is at SSE capacity (${slot.total}/${slot.cap})`,
        code: "CONFLICT",
        status: 503,
        details: { total: slot.total, cap: slot.cap },
      },
      { status: 503, headers: SSE_CORS_HEADERS },
    );
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    unsubscribe?.();
    if (heartbeat) clearInterval(heartbeat);
    slot.release();
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Best-effort cleanup if the controller errored (e.g. client
          // already disconnected between throttle windows).
          cleanup();
        }
      };
      const sendSnapshot = (snap: unknown) => {
        send(`data: ${JSON.stringify(snap)}\n\n`);
      };
      // Subscribe — the room pushes the current snapshot immediately
      // on subscribe (see RaceRoom.subscribe) so the client doesn't
      // sit blank for the first throttle window.
      unsubscribe = room.subscribe(sendSnapshot);
      // Heartbeat keeps the connection warm through Vercel's idle
      // timeout. A comment line is invisible to the EventSource client.
      heartbeat = setInterval(() => send(`: ping\n\n`), 15_000);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable Vercel/proxy buffering for SSE.
      "X-Accel-Buffering": "no",
      ...SSE_CORS_HEADERS,
    },
  });
}
