import { z } from "zod";
import type { UserTagId } from "./user-tag";

/** Input to `share.get` — either a full UUID testId or a friendly
 *  share slug like `saif-92wpm-a3f9c0d1`. The server parses the slug
 *  to its trailing hex prefix and looks the test up that way; bare
 *  UUIDs still resolve because the parser treats the whole input as
 *  a single hex segment when there's no `-`-decoration. 128-char cap
 *  comfortably covers any plausible slug shape. */
export const getSharedTestInputSchema = z.object({
  slug: z.string().min(1).max(128),
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
   *  consumer pairs this with `lengthKind` to format. */
  durationOrWordCount: number;
  /** The practice length-kind: 'time' | 'words' | 'quote' | 'burst', or
   *  null on legacy rows. Tells the label whether `durationOrWordCount`
   *  is seconds or a word count — `mode` (the algorithmic axis) can't
   *  (FT-032). */
  lengthKind: string | null;
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
  /** Roll-up stats from the live test screen — null on legacy rows
   *  submitted before the share feature shipped, populated for every
   *  new run. The share-card renderer reads these to mirror the
   *  seven-stat row the user saw post-test. */
  rawWpm: number | null;
  peakWpm: number | null;
  avgWpm: number | null;
  stallWpm: number | null;
  consistency: number | null;
  /** Per-second WPM samples from the run. Same source the live
   *  <ResultChart> consumes; persisted so the share image can render
   *  the same trace shape. Null on legacy rows. */
  wpmHistory: { t: number; wpm: number; raw: number }[] | null;
};
