/** Server-side bot model. Source of truth for the race room — bots
 *  on the client (`src/app/race/_components/race-data.ts`) are a
 *  display-only mirror.
 *
 *  Each bot has a target WPM, a noise band, a ramp time, and an
 *  accuracy target. The first three drive `instantBotWpm`; the last
 *  drives realistic error accrual inside the room tick so a 87%
 *  bot ends a race with visible mistakes on its row instead of the
 *  perfect-100% number the old model produced. */

export type BotId =
  | "damiel"
  | "haru"
  | "nadya"
  | "selan"
  | "elias"
  | "mireille"
  | "kassia"
  | "yusuf"
  | "onyx";

export type BotProfile = {
  id: BotId;
  name: string;
  flag: string;
  badge: string;
  /** Steady-state WPM after ramp. */
  targetWpm: number;
  /** Per-tick noise band around the target — higher = streakier. */
  noiseWpm: number;
  /** Seconds to ramp from half-target → full target. */
  rampSeconds: number;
  /** Fraction of correctly-typed chars (0..1). Drives per-char error
   *  rolls inside the room tick. 0.99 is a top racer, 0.87 is a
   *  beginner who hits a wrong letter every dozen-ish keys. */
  accuracyTarget: number;
};

/** Bot roster. Nine personalities spanning ~40–200 WPM and 87–99%
 *  accuracy, so a solo player races against a wide spectrum of
 *  opponents instead of three machine-perfect speedsters.
 *
 *  Tuning intent:
 *    - Fast tier (haru, damiel, nadya) — low noise, short ramp, high
 *      accuracy. Feels confident and clean.
 *    - Mid tier (selan, elias, mireille) — medium noise, normal ramp,
 *      mid accuracy. The bracket most real players sit in.
 *    - Slow tier (kassia, yusuf, onyx) — higher noise, longer ramp,
 *      lower accuracy. Streaky, occasionally fast-fingered, occasionally
 *      hesitant. */
export const BOTS: Record<BotId, BotProfile> = {
  damiel: {
    id: "damiel",
    name: "@damiel",
    flag: "🇸🇪",
    badge: "GRANDMASTER",
    targetWpm: 188,
    noiseWpm: 12,
    rampSeconds: 3,
    accuracyTarget: 0.99,
  },
  haru: {
    id: "haru",
    name: "@haru",
    flag: "🇯🇵",
    badge: "ELITE",
    targetWpm: 165,
    noiseWpm: 8,
    rampSeconds: 3,
    accuracyTarget: 0.985,
  },
  nadya: {
    id: "nadya",
    name: "@nadya",
    flag: "🇵🇱",
    badge: "EXPERT",
    targetWpm: 142,
    noiseWpm: 14,
    rampSeconds: 4,
    accuracyTarget: 0.96,
  },
  selan: {
    id: "selan",
    name: "@selan",
    flag: "🇨🇦",
    badge: "ADEPT",
    targetWpm: 118,
    noiseWpm: 11,
    rampSeconds: 4,
    accuracyTarget: 0.95,
  },
  elias: {
    id: "elias",
    name: "@elias",
    flag: "🇩🇪",
    badge: "ADEPT",
    targetWpm: 98,
    noiseWpm: 9,
    rampSeconds: 4,
    accuracyTarget: 0.94,
  },
  mireille: {
    id: "mireille",
    name: "@mireille",
    flag: "🇫🇷",
    badge: "STEADY",
    targetWpm: 82,
    noiseWpm: 12,
    rampSeconds: 5,
    accuracyTarget: 0.93,
  },
  kassia: {
    id: "kassia",
    name: "@kassia",
    flag: "🇩🇪",
    badge: "STEADY",
    targetWpm: 72,
    noiseWpm: 14,
    rampSeconds: 5,
    accuracyTarget: 0.92,
  },
  yusuf: {
    id: "yusuf",
    name: "@yusuf",
    flag: "🇹🇷",
    badge: "ROOKIE",
    targetWpm: 58,
    noiseWpm: 16,
    rampSeconds: 6,
    accuracyTarget: 0.9,
  },
  onyx: {
    id: "onyx",
    name: "@onyx",
    flag: "🇺🇸",
    badge: "ROOKIE",
    targetWpm: 42,
    noiseWpm: 18,
    rampSeconds: 6,
    accuracyTarget: 0.87,
  },
};

/** Default bot lineup per mode. `1v1` seats the host plus one mid-tier
 *  opponent so a solo player always has someone to race. `quote` and
 *  `burst` are dormant lineups kept for if/when those modes return —
 *  they aren't in `RACE_MODE_IDS`, so nothing requests them today. */
export const BOT_LINEUP: Record<string, readonly BotId[]> = {
  "1v1": ["mireille"],
  quote: ["elias", "mireille"],
  burst: ["nadya", "kassia"],
  // Free-for-all is real-players-only — explicit empty lineup so the
  // `?? ["selan"]` fallback can never slip a bot into an FFA room.
  ffa: [],
};

/** Seats per mode. Free-for-all is a big open lobby (real players only,
 *  no bots), so its capacity is fixed rather than derived from a bot
 *  lineup. Every other mode seats the host plus its bot lineup — note
 *  challenge/FFA rooms no longer fill those bot seats (see
 *  `RaceRoom.hostStart`), so for them this is just the real-player cap. */
export const FFA_CAPACITY = 8;

export function capacityFor(modeId: string): number {
  if (modeId === "ffa") return FFA_CAPACITY;
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
 *  reproduce identical bot trajectories. */
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
  const rng = mulberry32(hashBotSeed(bot.id, raceSeed, elapsedMs));
  const jitter = (rng() * 2 - 1) * bot.noiseWpm;
  return Math.max(20, base + jitter);
}

/** Deterministic per-bot error roll. Returns `true` when this bot
 *  would have mistyped the char at `charIndex` of the passage given
 *  its accuracyTarget and the race seed. Seeded so a replay of the
 *  same race produces identical error placement. */
export function botMistakesChar(
  bot: BotProfile,
  charIndex: number,
  raceSeed: number,
): boolean {
  if (bot.accuracyTarget >= 1) return false;
  const rng = mulberry32(hashBotSeed(bot.id, raceSeed, charIndex * 1000));
  return rng() >= bot.accuracyTarget;
}

/** Combine the bot id, race seed, and a numeric salt (elapsedMs for
 *  WPM jitter, charIndex for error rolls) into a 32-bit seed for
 *  mulberry32. Exposed so the room tick can call it once per tick
 *  and reuse one RNG for a batch of error rolls. */
export function hashBotSeed(
  botId: string,
  raceSeed: number,
  salt: number,
): number {
  let h = raceSeed | 0;
  for (let i = 0; i < botId.length; i += 1) {
    h = (h * 31 + botId.charCodeAt(i)) | 0;
  }
  return h ^ Math.floor(salt) | 0;
}
