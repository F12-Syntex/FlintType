import { relativeTime } from "@/lib/relative-time";
import type { PresenceEntry } from "@/types/presence";

/** Maps a presence entry to the caption shown under a friend's name: a
 *  status-dot class + a short label. Every online state stays on the
 *  sanctioned green (`bg-ft-ok`) — the coral spark is reserved for
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

/** Short activity verb for the compact "Online" strip chips, or null for
 *  a plain-online user (the green avatar dot already reads as "online",
 *  so a redundant "Online" word would just add noise). */
export function activityWord(entry: PresenceEntry): string | null {
  if (!entry.online) return null;
  if (entry.status === "practicing") return "Typing";
  if (entry.status === "racing") return "Racing";
  return null;
}
