import { relativeTime } from "@/lib/relative-time";
import type { PresenceEntry } from "@/types/presence";

/** Maps a presence entry to the caption shown under a friend's name in
 *  the dock: a status-dot class + a short label. Every online state stays
 *  on the sanctioned green (`bg-ft-ok`) — the coral spark is reserved for
 *  live-broadcasting (ui-law §2), so activity is carried by the *word*,
 *  never a second colour. Offline drops to a quiet neutral dot + the
 *  relative "last active" time. */
export type PresenceCaption = { label: string; dotClass: string };

export function presenceCaption(
  entry: PresenceEntry,
  now: number = Date.now(),
): PresenceCaption {
  if (!entry.online) {
    return {
      label: `Active ${relativeTime(entry.lastSeenMs, now)}`,
      dotClass: "bg-muted-foreground/40",
    };
  }
  switch (entry.status) {
    case "practicing":
      return { label: "Practising", dotClass: "bg-ft-ok" };
    case "racing":
      return { label: "In a race", dotClass: "bg-ft-ok" };
    case "idle":
      return { label: "Away", dotClass: "bg-ft-ok/50" };
    default:
      return { label: "Online", dotClass: "bg-ft-ok" };
  }
}
