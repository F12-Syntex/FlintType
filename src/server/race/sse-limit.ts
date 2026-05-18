/** Concurrent-EventSource limiter for the race authority.
 *
 *  Two ceilings:
 *    - MAX_SSE_TOTAL  — hard cap on subscribers across all rooms,
 *      sized to keep file-descriptor + heartbeat-timer pressure well
 *      inside a single Railway Hobby instance even under a
 *      coordinated flood. Past this the route 503s.
 *    - MAX_SSE_PER_IP — per-real-IP cap so one IP can't pin the
 *      global ceiling on its own. 5 leaves room for a user with
 *      multiple tabs without letting a script open thousands of
 *      sockets from a single host. Past this the route 429s.
 *
 *  The unload beacon + 5-min idle GC + onerror reconnect throttling
 *  all mean these counts decay quickly under honest use; the cap
 *  only bites under abuse.
 *
 *  Implementation is a tiny pair of integer counters + a
 *  per-IP map. No external store — the SSE route is bound to one
 *  process (the race authority) so a process-local counter is the
 *  authoritative number. */

export const MAX_SSE_TOTAL = 2000;
export const MAX_SSE_PER_IP = 5;

type Counts = {
  total: number;
  perIp: Map<string, number>;
};

const counts: Counts = {
  total: 0,
  perIp: new Map(),
};

export type SseAcquireOk = { ok: true; release: () => void };
export type SseAcquireDeny =
  | { ok: false; reason: "total"; total: number; cap: number }
  | { ok: false; reason: "per-ip"; ip: string; count: number; cap: number };

/** Try to reserve one SSE slot for `ip`. Returns either a release
 *  callback (call it exactly once when the connection closes) or a
 *  structured deny describing which ceiling fired. Never throws. */
export function acquireSseSlot(ip: string): SseAcquireOk | SseAcquireDeny {
  if (counts.total >= MAX_SSE_TOTAL) {
    return {
      ok: false,
      reason: "total",
      total: counts.total,
      cap: MAX_SSE_TOTAL,
    };
  }
  const current = counts.perIp.get(ip) ?? 0;
  if (current >= MAX_SSE_PER_IP) {
    return {
      ok: false,
      reason: "per-ip",
      ip,
      count: current,
      cap: MAX_SSE_PER_IP,
    };
  }
  counts.total += 1;
  counts.perIp.set(ip, current + 1);
  let released = false;
  const release = () => {
    if (released) return; // defensive: SSE cancel + onerror can race
    released = true;
    counts.total -= 1;
    const next = (counts.perIp.get(ip) ?? 1) - 1;
    if (next <= 0) counts.perIp.delete(ip);
    else counts.perIp.set(ip, next);
  };
  return { ok: true, release };
}

/** Snapshot the current counts for logs / dashboards. */
export function sseStats(): { total: number; ipBuckets: number } {
  return { total: counts.total, ipBuckets: counts.perIp.size };
}

/** Test-only reset. Never call from app code. */
export function __resetSseLimitForTests(): void {
  counts.total = 0;
  counts.perIp.clear();
}
