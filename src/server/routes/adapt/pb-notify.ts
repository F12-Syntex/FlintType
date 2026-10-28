import type { Database } from "@/db/server";
import type { Logger } from "@/server/logger";
import { resolveUserDisplays } from "@/server/user-display";
import type { SubmitTestInput } from "@/types/adapt";
import type { FriendPbNotificationData } from "@/types/notification";

/** Side effects of a personal best, run by `adapt.submit` after the
 *  test row is written. Never throws. */
export async function notifyPersonalBest(args: {
  db: Database;
  log: Logger;
  userId: string;
  testId: string;
  input: SubmitTestInput;
  previousWpm: number | null;
}): Promise<void> {
  const { db, log, userId, testId, input, previousWpm } = args;
  // Personal-best notification — fires when a completed run beats
  // the prior best for the same (mode, length) bucket. The very
  // first completed run in a bucket *also* counts (previousWpm is
  // null), since "first time finishing 60s casual" is itself a
  // milestone worth surfacing. Wrapped in createIfAbsent so a
  // duplicate adapt.submit can't double-fire — the dedupe key is
  // the test row id, which is unique by construction. Failures are
  // swallowed: an analytics notification falling over must never
  // turn a good test submit into a 5xx.
  try {
    await db.notifications.createIfAbsent({
      userId,
      kind: "personal_best",
      title: previousWpm == null ? "First completed run" : "New personal best",
      body: formatPbBody(input, previousWpm),
      data: {
        mode: input.mode,
        durationOrWordCount: input.durationOrWordCount,
        wpm: input.wpm,
        accuracy: input.accuracy,
        previousWpm,
      },
      dedupeKey: `pb:${testId}`,
    });
  } catch (err) {
    log.warn("personal-best notification create failed", {
      userId,
      testId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fan the PB out to the user's followers — "a friend hit a PB",
  // the social half of the activity feed. Its own try so a Clerk
  // hiccup, zero followers, or anything else here can never turn a
  // good submit into a 5xx. Deduped on the run id so a follower
  // gets at most one row per PB.
  try {
    const followers = await db.follows.listFollowers(userId);
    if (followers.length > 0) {
      const displays = await resolveUserDisplays(db, [userId]);
      const me = displays.get(userId);
      const name = me?.name ?? "A friend";
      const where = formatLength(input.mode, input.durationOrWordCount);
      await Promise.all(
        followers.map((f) =>
          db.notifications.createIfAbsent({
            userId: f.userId,
            kind: "friend_pb",
            title: "A friend hit a personal best",
            body: `${name} hit ${Math.round(input.wpm)} wpm on ${where}.`,
            data: {
              friendId: userId,
              friendName: name,
              friendUsername: me?.username ?? null,
              mode: input.mode,
              durationOrWordCount: input.durationOrWordCount,
              wpm: input.wpm,
              accuracy: input.accuracy,
            } satisfies FriendPbNotificationData,
            dedupeKey: `friend_pb:${testId}`,
          }),
        ),
      );
    }
  } catch (err) {
    log.warn("friend-pb fan-out failed", {
      userId,
      testId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Compose the body line for a personal-best notification. WORDS
 *  modes show the word count; TIME modes show seconds; QUOTE / other
 *  modes fall back to the raw amount. The previous best is appended
 *  in parens when there was one, so the user can read the delta at a
 *  glance ("Casual 60s · 102 wpm · 98% acc (previous best 92)"). */
export function formatPbBody(
  input: SubmitTestInput,
  previousWpm: number | null,
): string {
  const lengthLabel = formatLength(input.mode, input.durationOrWordCount);
  const modeLabel = input.mode === "training" ? "Training" : "Casual";
  const head = `${modeLabel} ${lengthLabel} · ${Math.round(input.wpm)} wpm · ${input.accuracy.toFixed(1)}% acc`;
  if (previousWpm == null) return head;
  // Derive the delta from the ROUNDED figures the user sees, not from
  // the raw difference — otherwise round(new) − round(prev) can disagree
  // with the displayed "+N" (e.g. 160 shown, 156 shown, but +5 from the
  // unrounded gap). Now 160 − 156 == +4 always reconciles (#12).
  const delta = Math.round(input.wpm) - Math.round(previousWpm);
  const deltaTail =
    delta > 0 ? ` (previous best ${Math.round(previousWpm)} · +${delta})` : ` (previous best ${Math.round(previousWpm)})`;
  return head + deltaTail;
}

function formatLength(mode: string, amount: number): string {
  // Time-mode lengths read as seconds; everything else as a count.
  if (mode === "time" || (typeof amount === "number" && amount >= 5 && amount <= 600 && /time/i.test(mode))) {
    return `${amount}s`;
  }
  return String(amount);
}
