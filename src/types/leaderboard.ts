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

export const leaderboardInputSchema = z.object({
  scope: leaderboardScopeSchema.optional(),
  window: leaderboardWindowSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type LeaderboardInput = z.infer<typeof leaderboardInputSchema>;

export type LeaderboardEntry = {
  testId: string;
  rank: number;
  /** Display name pulled from Clerk; "Guest" for users we can't
   *  resolve (deleted account, anonymous, etc). */
  name: string;
  /** Lower-case handle (firstName/username/email-localpart) for
   *  linking to their public profile. Null when name is "Guest". */
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
  entries: readonly LeaderboardEntry[];
  /** Snapshot timestamp so the client can show "as of X". */
  generatedAtMs: number;
};
