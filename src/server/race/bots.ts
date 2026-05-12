/** Server-side bot model. Same deterministic WPM curve as the
 *  original client-side race-data.ts so a player who's seen bots on
 *  the old offline flow gets recognisable opponents on the new
 *  online flow. Curve = ramp-in + per-tick noise; seeded so two
 *  identical race seeds produce identical bot trajectories.
 *
 *  Why duplicate from the client: the client copy is a UI/data file
 *  imported by other client components; importing it from `@/server`
 *  would drag client-only bits (and the client doesn't need to know
 *  about bot ticking anymore now that the server runs it). The
 *  source of truth lives here on the server. */

export type BotId = "damiel" | "selan" | "kassia";

export type BotProfile = {
  id: BotId;
  name: string;
  flag: string;
  badge: string;
  targetWpm: number;
  noiseWpm: number;
  rampSeconds: number;
};

export const BOTS: Record<BotId, BotProfile> = {
  damiel: {
    id: "damiel",
    name: "@damiel",
    flag: "🇸🇪",
    badge: "GRANDMASTER",
    targetWpm: 188,
    noiseWpm: 14,
    rampSeconds: 3,
  },
  selan: {
    id: "selan",
    name: "@selan",
    flag: "🇨🇦",
    badge: "EXPERT",
    targetWpm: 128,
    noiseWpm: 9,
    rampSeconds: 4,
  },
  kassia: {
    id: "kassia",
    name: "@kassia",
    flag: "🇩🇪",
    badge: "ADEPT",
    targetWpm: 78,
    noiseWpm: 6,
    rampSeconds: 5,
  },
};

/** Default bot lineup per mode. Same shape as the client's
 *  RACE_MODES so matchmaking-fill behaviour matches what offline
 *  players saw. */
export const BOT_LINEUP: Record<string, readonly BotId[]> = {
  "1v3": ["damiel", "selan", "kassia"],
  "1v1": ["selan"],
  sprint: ["damiel", "selan"],
  endurance: ["selan", "kassia"],
  burst: ["selan", "kassia"],
};

export function capacityFor(modeId: string): number {
  const bots = BOT_LINEUP[modeId] ?? ["selan"];
  return bots.length + 1;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bot's instantaneous WPM at `elapsedMs` into the race. Ramp from
 *  half-speed to target over `rampSeconds`, then noise band on top.
 *  Seeded by raceSeed × botId so two races with the same seed
 *  reproduce identical bot motion across instances and tabs. */
export function instantBotWpm(
  bot: BotProfile,
  elapsedMs: number,
  raceSeed: number,
): number {
  const ramp =
    bot.rampSeconds <= 0
      ? 1
      : Math.min(1, 0.5 + (elapsedMs / 1000 / bot.rampSeconds) * 0.5);
  const base = bot.targetWpm * ramp;
  let h = raceSeed | 0;
  for (let i = 0; i < bot.id.length; i += 1) {
    h = (h * 31 + bot.id.charCodeAt(i)) | 0;
  }
  const rng = mulberry32(h ^ Math.floor(elapsedMs / 100));
  const jitter = (rng() * 2 - 1) * bot.noiseWpm;
  return Math.max(20, base + jitter);
}
