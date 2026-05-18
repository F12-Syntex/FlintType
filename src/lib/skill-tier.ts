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

/** XP-derived user level. XP itself is the sum of net-WPM across
 *  every completed run — so a player ascends both by typing more
 *  (volume) and by typing faster (skill). Level grows
 *  ~sqrt(xp / SCALE) so the early grind is fast and the late grind
 *  is satisfying. Floor at 1 so a fresh signup always reads as
 *  L1, never L0.
 *
 *  Pure — input is the precomputed XP scalar (server aggregates
 *  it once via SUM(wpm * accuracy / 100)). */
const LEVEL_SCALE = 50;

export function levelForXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  return Math.max(1, Math.floor(Math.sqrt(xp / LEVEL_SCALE)) + 1);
}

/** Inverse — XP required to *just reach* the given level. Drives
 *  the "next level in N XP" hint a future profile card could show.
 *  Right now the level page just renders the level number; the
 *  function is exported so the formula stays in one file. */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level)) - 1;
  return l * l * LEVEL_SCALE;
}
