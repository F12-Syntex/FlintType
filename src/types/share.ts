import { z } from "zod";
import type { UserTagId } from "./user-tag";

/** Input to `share.get` — a single completed test id. Bounded length
 *  matches `randomUUID()` output (36 chars) with generous slack so a
 *  schema tweak elsewhere doesn't break this route silently. */
export const getSharedTestInputSchema = z.object({
  testId: z.string().min(1).max(64),
});
export type GetSharedTestInput = z.infer<typeof getSharedTestInputSchema>;

/** Public-safe projection of a completed test row, joined with the
 *  runner's Clerk identity (display handle + avatar).
 *
 *  Anyone with the share link sees this — there is no auth gate on
 *  `share.get`. Fields that touch model internals (keystroke timings,
 *  bigram counts, the runner's email) are intentionally absent. */
export type SharedTest = {
  testId: string;
  /** Test mode as stored — `casual`, `training`, `race`, etc. The
   *  client maps to a friendly label. */
  mode: string;
  /** WORDS → word count, TIME → seconds, QUOTE → group index. The
   *  consumer pairs this with `mode` to format. */
  durationOrWordCount: number;
  wpm: number;
  accuracy: number;
  errorCount: number;
  /** Wall-clock duration of the run, in seconds. `completedAt -
   *  startedAt`. Used to render `0:34`-style elapsed labels on the
   *  share card. */
  durationSec: number;
  completedAtMs: number;
  /** Display handle — `@name`. Falls back to `@racer` if Clerk
   *  doesn't recognise the userId at lookup time (deleted user, or
   *  a Clerk outage). */
  handle: string;
  /** Routable username slug for the runner's profile, or `null` when
   *  the runner has no Clerk username set (the profile is still
   *  reachable via `/profile/user_…` in that case). */
  username: string | null;
  /** Absolute URL to the runner's uploaded avatar, or `null` when
   *  they haven't uploaded one — we don't return Clerk's
   *  auto-generated gradient placeholder. */
  avatarUrl: string | null;
  /** Identity tags the runner wears in public surfaces (OG, OWNER,
   *  …). Already intersected with the runner's display selection by
   *  the server. */
  tags: UserTagId[];
};
