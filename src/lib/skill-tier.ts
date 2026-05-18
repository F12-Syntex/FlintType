/** Derive a typing-skill tier (and its display label) from a net
 *  WPM number. Mirrors the bot badge ladder in `src/server/race/bots.ts`
 *  so a user's tier reads as "where they'd sit in a bot race".
 *
 *  Pure — no I/O, no React. Used by the leaderboard's top-players
 *  strip and anywhere else a user-facing tier needs to be rendered.
 *
 *  Ladder (net WPM = wpm × accuracy / 100):
 *    ≥180  Grandmaster
 *    ≥150  Elite
 *    ≥120  Expert
 *    ≥ 90  Adept
 *    ≥ 60  Steady
 *    <60   Rookie
 *
 *  Thresholds are deliberate breakpoints — adjust them here and every
 *  display surface updates in lockstep. */
export type SkillTierId =
  | "grandmaster"
  | "elite"
  | "expert"
  | "adept"
  | "steady"
  | "rookie";

export type SkillTier = {
  id: SkillTierId;
  label: string;
  /** Lower bound on net WPM that earns this tier. */
  threshold: number;
};

export const SKILL_TIERS: readonly SkillTier[] = [
  { id: "grandmaster", label: "GRANDMASTER", threshold: 180 },
  { id: "elite", label: "ELITE", threshold: 150 },
  { id: "expert", label: "EXPERT", threshold: 120 },
  { id: "adept", label: "ADEPT", threshold: 90 },
  { id: "steady", label: "STEADY", threshold: 60 },
  { id: "rookie", label: "ROOKIE", threshold: 0 },
];

export function skillTierForNetWpm(netWpm: number): SkillTier {
  for (const tier of SKILL_TIERS) {
    if (netWpm >= tier.threshold) return tier;
  }
  // Unreachable — the lowest threshold is 0 and netWpm is always
  // non-negative — but TypeScript can't prove the loop returns.
  return SKILL_TIERS[SKILL_TIERS.length - 1]!;
}
