import { NextResponse, type NextRequest } from "next/server";
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
 *  (crypto.randomBytes, setTimeout). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  const { roomId } = await params;
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json(
      { error: `race room "${roomId}" not found`, code: "NOT_FOUND", status: 404 },
      { status: 404 },
    );
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
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
      closed = true;
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable Vercel/proxy buffering for SSE.
      "X-Accel-Buffering": "no",
    },
  });
}
