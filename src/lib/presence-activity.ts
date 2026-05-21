import type { PresenceStatus } from "@/types/presence";

/** The activity the local user is currently doing, reported through the
 *  global presence heartbeat so friends see *what* they're up to, not
 *  just that they're online.
 *
 *  A tiny module-level store (deliberately not React): any surface can
 *  declare its activity with `<ReportActivity>` without prop-drilling
 *  into the globally-mounted heartbeat, and the heartbeat reads the
 *  current value each time it fires. Defaults to "online"; practice and
 *  race surfaces set "practicing" / "racing" while mounted and reset to
 *  "online" on unmount. Subscribers (the heartbeat) get a callback on
 *  every change so a transition propagates immediately, not on the next
 *  ~30s beat. */
let current: PresenceStatus = "online";
const listeners = new Set<() => void>();

export function getActivity(): PresenceStatus {
  return current;
}

export function setActivity(status: PresenceStatus): void {
  if (status === current) return;
  current = status;
  for (const listener of listeners) listener();
}

export function subscribeActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
