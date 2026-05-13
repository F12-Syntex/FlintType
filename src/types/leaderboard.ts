import { z } from "zod";

/** Leaderboard scope — which slice of test rows feeds the ranking.
 *  `all` keeps every completed run; `race` restricts to multiplayer-
 *  race output specifically. Time filters are independent. */
export const leaderboardScopeSchema = z.enum([
  "all",
  "casual",
  "training",
  "race",
]);
export type LeaderboardScope = z.infer<typeof leaderboardScopeSchema>;

export const leaderboardWindowSchema = z.enum([
  "all_time",
  "month",
  "week",
  "day",
]);
export type LeaderboardWindow = z.infer<typeof leaderboardWindowSchema>;

/** Preset slice — pins the leaderboard to one (test-length) bucket
 *  so a 15-second run only competes against other 15-second runs. The
 *  `amount` value maps directly to the test row's `durationOrWordCount`
 *  column. We keep word-count and time-duration values in the same
 *  flat namespace; their numeric domains don't overlap (10/25/50/100
 *  vs 15/30/60/120) so a single number disambiguates. */
export const leaderboardPresetSchema = z.enum([
  "any",
  "w10",
  "w25",
  "w50",
  "w100",
  "t15",
  "t30",
  "t60",
  "t120",
]);
export type LeaderboardPreset = z.infer<typeof leaderboardPresetSchema>;

/** Numeric amount carried by each preset, or null for "any". */
export const PRESET_AMOUNT: Record<LeaderboardPreset, number | null> = {
  any: null,
  w10: 10,
  w25: 25,
  w50: 50,
  w100: 100,
  t15: 15,
  t30: 30,
  t60: 60,
  t120: 120,
};

export const leaderboardInputSchema = z.object({
  scope: leaderboardScopeSchema.optional(),
  window: leaderboardWindowSchema.optional(),
  preset: leaderboardPresetSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type LeaderboardInput = z.infer<typeof leaderboardInputSchema>;

export type LeaderboardEntry = {
  testId: string;
  rank: number;
  /** Display name pulled from Clerk. Rows whose userId Clerk can't
   *  resolve are filtered out before this list is built, so every
   *  entry here represents a real signed-in user. */
  name: string;
  /** Lower-case handle (firstName/username/email-localpart) for
   *  linking to their public profile. */
  username: string | null;
  netWpm: number;
  wpm: number;
  accuracy: number;
  mode: string;
  durationOrWordCount: number;
  completedAtMs: number;
};

export type LeaderboardOutput = {
  scope: LeaderboardScope;
  window: LeaderboardWindow;
  preset: LeaderboardPreset;
  entries: readonly LeaderboardEntry[];
  /** Snapshot timestamp so the client can show "as of X". */
  generatedAtMs: number;
};
