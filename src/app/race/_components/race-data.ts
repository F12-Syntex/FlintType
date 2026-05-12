import { EN_COMMON_1000 } from "@/data/en-common-1000";

/** Race configuration. Each mode pairs a passage length with a bot
 *  line-up — same single-player loop, different shape. */
export type RaceModeId = "1v3" | "1v1" | "sprint" | "endurance";

export type RaceMode = {
  id: RaceModeId;
  name: string;
  /** Short caption shown under the mode chip in the sidebar. */
  detail: string;
  /** Number of words in the race passage. */
  wordCount: number;
  /** Bot ids in display order. */
  botIds: readonly BotId[];
};

export const RACE_MODES: Record<RaceModeId, RaceMode> = {
  "1v3": {
    id: "1v3",
    name: "1V3",
    detail: "4 racers · 50 words",
    wordCount: 50,
    botIds: ["damiel", "selan", "kassia"],
  },
  "1v1": {
    id: "1v1",
    name: "1V1",
    detail: "head-to-head · 25 words",
    wordCount: 25,
    botIds: ["selan"],
  },
  sprint: {
    id: "sprint",
    name: "SPRINT",
    detail: "fast-pair · 15 words",
    wordCount: 15,
    botIds: ["damiel", "selan"],
  },
  endurance: {
    id: "endurance",
    name: "ENDURANCE",
    detail: "marathon · 100 words",
    wordCount: 100,
    botIds: ["selan", "kassia"],
  },
};

export const RACE_MODE_ORDER: readonly RaceModeId[] = [
  "1v3",
  "1v1",
  "sprint",
  "endurance",
];

/** Bot tick interval. 50ms = 20 ticks/sec, fine-grained enough to
 *  render smooth bot motion without burning the JS thread. */
export const BOT_TICK_MS = 50;
/** Trace sample interval used when the race builds the post-run
 *  summary chart. We sample once per second so the curve carries
 *  shape without bloating the snapshot array. */
export const TRACE_SAMPLE_MS = 1000;
export const COUNTDOWN_SECONDS = 3;

/** Deterministic bot definition. Bots are local opponents — no
 *  network, no server-side state. Each bot has a steady-state target
 *  WPM, a per-tick noise band so the curve reads organic, and a
 *  short ramp-up at the start so nobody hits full speed instantly. */
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

/** Race passage. Drawn from the top-300 slice of the common-1000 list
 *  so the words feel like fluent prose without dropping into rare
 *  vocab. Seeded so two consumers (e.g. SSR + client) line up on the
 *  same passage. */
export function generateRacePassage(count: number, seed: number): string[] {
  const rng = mulberry32(seed);
  const pool = EN_COMMON_1000.slice(0, 300);
  const out: string[] = [];
  let prev = "";
  while (out.length < count) {
    const w = pool[Math.floor(rng() * pool.length)]!;
    if (w === prev) continue;
    out.push(w);
    prev = w;
  }
  return out;
}

/** A bot's instantaneous WPM at time `elapsedMs` into the race —
 *  ramp + noise. Driven by a per-bot RNG keyed by raceSeed + id, so
 *  two runs with the same seed reproduce identical bot motion. */
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
  for (let i = 0; i < bot.id.length; i++) h = (h * 31 + bot.id.charCodeAt(i)) | 0;
  const rng = mulberry32(h ^ Math.floor(elapsedMs / 100));
  const jitter = (rng() * 2 - 1) * bot.noiseWpm;
  return Math.max(20, base + jitter);
}

/** Map a racer's char count to a `[0..1]` race progress. */
export function progressOf(correctChars: number, totalChars: number): number {
  if (totalChars <= 0) return 0;
  return Math.max(0, Math.min(1, correctChars / totalChars));
}

/** Stable per-racer colour for the multiplayer overlay. Lifts from
 *  the project's `--chart-*` palette so the values inherit the
 *  active theme (light / dark / community palette) instead of
 *  burning in hex. The human stays on `--primary`; bots draw from
 *  the chart slots so they're distinguishable from each other and
 *  from the brand spark. */
export function playerColorFor(id: string): string {
  switch (id) {
    case "you":
      return "var(--primary)";
    case "damiel":
      return "var(--chart-4)";
    case "selan":
      return "var(--chart-3)";
    case "kassia":
      return "var(--chart-5)";
    default:
      return "var(--muted-foreground)";
  }
}
