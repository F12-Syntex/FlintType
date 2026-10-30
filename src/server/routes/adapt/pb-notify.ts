import type { Database } from "@/db/server";
import { friendPbSentence, pbSentence } from "@/lib/pb-copy";
import type { Logger } from "@/server/logger";
import { resolveUserDisplays } from "@/server/user-display";
import type { SubmitTestInput } from "@/types/adapt";
import type { FriendPbNotificationData, PersonalBestData } from "@/types/notification";

/** Side effects of a personal best, run by `adapt.submit` after the
 *  test row is written. Never throws. Bodies are sentences from
 *  `src/lib/pb-copy.ts` ("102 wpm at 98% accuracy in a Casual test of
 *  60 seconds."); the popover rebuilds them from `data` on display. */
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
      // The previous best isn't in the body: the row shows it once, as
      // a delta line built from `data` (ui-law §17.8).
      body: pbSentence(input),
      data: {
        mode: input.mode,
        durationOrWordCount: input.durationOrWordCount,
        lengthMode: input.lengthMode ?? null,
        wpm: input.wpm,
        accuracy: input.accuracy,
        previousWpm,
      } satisfies PersonalBestData,
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
      await Promise.all(
        followers.map((f) =>
          db.notifications.createIfAbsent({
            userId: f.userId,
            kind: "friend_pb",
            title: "A friend hit a personal best",
            body: friendPbSentence(name, input),
            data: {
              friendId: userId,
              friendName: name,
              friendUsername: me?.username ?? null,
              mode: input.mode,
              durationOrWordCount: input.durationOrWordCount,
              lengthMode: input.lengthMode ?? null,
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
