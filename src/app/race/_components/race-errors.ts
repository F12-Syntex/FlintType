import { BackendError } from "@/lib/errors";

/** Turn a failed race call (find race, create lobby, start, ready up,
 *  rematch) into one short sentence the UI can show under the button
 *  (ui-law §6.3: errors are visible, never swallowed).
 *
 *  Server messages are already plain ("everyone must ready up before
 *  the race can start"), so a typed `BackendError` shows its own message
 *  in sentence case. Rate limits and anything unexpected (network drop,
 *  INTERNAL) fall back to the caller's friendly line. */
export function raceErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof BackendError) {
    if (err.code === "RATE_LIMITED") {
      return "Too many tries in a row. Wait a moment and try again.";
    }
    if (err.code !== "INTERNAL" && err.message) {
      const msg = err.message.trim();
      const sentence = msg.charAt(0).toUpperCase() + msg.slice(1);
      return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
    }
  }
  return fallback;
}
