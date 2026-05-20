import { z } from "zod";
import type { MonkeytypeStatsSlice } from "./monkeytype";
import type { UserTagId } from "./user-tag";

/** Public-profile lookup input. The slug here is a Clerk username,
 *  not an email-local-part or Clerk userId — visitors can only view
 *  profiles of users who have set a real username. */
export const publicProfileInputSchema = z.object({
  username: z.string().min(1).max(64),
});
export type PublicProfileInput = z.infer<typeof publicProfileInputSchema>;

/** History page payload — one round-trip serves every panel:
 *  Headline insights, Daily chart, Pair evolution, Records, Run log.
 *  All client-side aggregation (binning by date, computing PRs,
 *  picking insights) reads from these arrays. */
export type HistoryTest = {
  id: string;
  startedAtMs: number;
  completedAtMs: number;
  /** "training" / "casual" / "reverse_adaptive" — see TestMode. */
  mode: string;
  /** Words for WORDS mode, seconds for TIME mode. */
  durationOrWordCount: number;
  wpm: number;
  accuracy: number;
  errorCount: number;
  wasCompleted: boolean;
};

export type HistoryWeakness = {
  /** Bigram key (lowercase, e.g. "th"). */
  key: string;
  /** Running-mean keystroke time, ms. */
  meanMs: number;
  /** Pre-computed weakness against the user's bigram baseline. */
  weakness: number;
  /** Sample count behind the mean. */
  sampleCount: number;
};

export type HistorySummaryOutput = {
  /** Newest-first. Capped at 500 — covers ~90 days of regular use. */
  recentTests: HistoryTest[];
  /** Top 12 weakest bigrams with enough samples to score. */
  weakestPairs: HistoryWeakness[];
  /** Top 12 weakest trigrams with enough samples to score. */
  weakestTrigrams: HistoryWeakness[];
  /** Top 20 slowest words against the user's own word baseline.
   *  Drives the worst-words drill — same shape as the bigram /
   *  trigram lists for symmetry. */
  weakestWords: HistoryWeakness[];
  /** True until the user has typed enough for the algorithm to score
   *  bigrams. Page should fall back to "no data yet" copy. */
  cold: boolean;
  /** User's overall bigram baseline (sample-weighted mean ms). 0 on
   *  cold start. */
  bigramBaselineMs: number;
  /** User's overall trigram baseline (same shape, separate metric). */
  trigramBaselineMs: number;
  /** User's overall whole-word baseline (sample-weighted mean ms
   *  across every word seen). 0 on cold start. */
  wordBaselineMs: number;
  /** Public MonkeyType overlay belonging to the *subject* of this
   *  profile (not the viewer). Returned by both `summary` (own
   *  profile) and `publicProfile` (someone else's) so visitors see
   *  the same level / PB merge as the owner. Encrypted Ape Key is
   *  stripped server-side — visitors only see the lifetime counters
   *  and PB cells that drive the rendered level + bests. */
  monkeytype: PublicMonkeytypeStats | null;
  /** Identity-marker tags currently displayed for the subject. This
   *  is the *eligibility ∩ selection* set — the user can hide tags
   *  they're eligible for, or opt out entirely. Paint beside the
   *  display name in array order. */
  tags: UserTagId[];
  /** Full set of tags the subject is *eligible* to display. Returned
   *  alongside `tags` so the edit-profile UI knows which chips to
   *  offer for toggling without a second round-trip. Visitors viewing
   *  someone else's profile receive the same array (it's not
   *  sensitive — tags are display data). */
  eligibleTags: UserTagId[];
  /** Subject's avatar URL — null when they haven't uploaded a real
   *  photo (Clerk's auto-generated gradient is suppressed at this
   *  layer). Returned by both `summary` (own avatar) and
   *  `publicProfile` (subject avatar visible to visitors) so the hero
   *  doesn't have to round-trip Clerk for someone else's photo. */
  subjectAvatarUrl: string | null;
  /** Subject's Clerk user id (`user_…`). Exposed so the profile hero
   *  can resolve the follow relationship + friend counts for a
   *  visitor without a username→id round-trip. Safe to ship — it's
   *  already the public profile-link fallback slug. */
  subjectUserId: string;
  /** Subject's lifetime counters that contribute to the XP/level
   *  total beyond the test-row count — drills completed, races
   *  finished + won. Read from the user-prefs blob. Returned for
   *  both own + visitor views so the level number rendered on the
   *  hero matches reality. */
  lifetimeStats: {
    drillsCompleted: number;
    racesFinished: number;
    racesWon: number;
  };
};

/** Subset of MonkeytypeStatsSlice safe to expose over the public
 *  profile route: counts, PBs, and the import timestamp. Strips the
 *  encrypted Ape Key, which the visitor has no business seeing even
 *  in encrypted form. */
export type PublicMonkeytypeStats = Omit<
  MonkeytypeStatsSlice,
  "encryptedApiKey"
>;
