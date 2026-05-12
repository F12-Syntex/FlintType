import { EN_COMMON_1000 } from "@/data/en-common-1000";

/** Race configuration. Each mode pairs a passage length (or a burst
 *  config) with a bot line-up. Two race kinds:
 *    - passage  → type a fixed passage; first to the line wins
 *    - burst    → repeat the same word until N consecutive bursts
 *                 land above a threshold WPM, then advance to the
 *                 next item; first to clear all items wins */
export type RaceModeId = "1v3" | "1v1" | "sprint" | "endurance" | "burst";

export type BurstConfig = {
  /** Words the racers cycle through. Each one has to be cleared
   *  `repsPerItem` consecutive times above `thresholdWpm` before the
   *  racer advances to the next. */
  items: readonly string[];
  repsPerItem: number;
  thresholdWpm: number;
};

export type RaceMode = {
  id: RaceModeId;
  name: string;
  /** Short caption shown under the mode chip in the sidebar. */
  detail: string;
  /** What kind of race UI mounts. Drives whether we render the
   *  passage surface or the burst surface in the race shell. */
  kind: "passage" | "burst";
  /** Number of words in the race passage. Ignored for `burst`. */
  wordCount: number;
  /** Bot ids in display order. */
  botIds: readonly BotId[];
  /** Required when `kind === "burst"`. The minigame parameters that
   *  drive both the user's surface and the bot rep simulation. */
  burst?: BurstConfig;
};

export const RACE_MODES: Record<RaceModeId, RaceMode> = {
  "1v3": {
    id: "1v3",
    name: "1V3",
    detail: "4 racers · 50 words",
    kind: "passage",
    wordCount: 50,
    botIds: ["damiel", "selan", "kassia"],
  },
  "1v1": {
    id: "1v1",
    name: "1V1",
    detail: "head-to-head · 25 words",
    kind: "passage",
    wordCount: 25,
    botIds: ["selan"],
  },
  sprint: {
    id: "sprint",
    name: "SPRINT",
    detail: "fast-pair · 15 words",
    kind: "passage",
    wordCount: 15,
    botIds: ["damiel", "selan"],
  },
  endurance: {
    id: "endurance",
    name: "ENDURANCE",
    detail: "marathon · 100 words",
    kind: "passage",
    wordCount: 100,
    botIds: ["selan", "kassia"],
  },
  burst: {
    id: "burst",
    name: "BURST",
    detail: "5 items · 3 reps each · 60 wpm gate",
    kind: "burst",
    wordCount: 0,
    botIds: ["selan", "kassia"],
    burst: {
      // Short, finger-friendly words drawn from the top-50 slice of
      // the common-1000 list. Five items × three reps = fifteen total
      // bursts to clear, finishing in roughly 30–60 s at the gate.
      items: ["fast", "type", "burst", "rapid", "swift"],
      repsPerItem: 3,
      thresholdWpm: 60,
    },
  },
};

export const RACE_MODE_ORDER: readonly RaceModeId[] = [
  "1v3",
  "1v1",
  "sprint",
  "endurance",
  "burst",
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

/** Stable per-racer colour for the multiplayer overlay. The human
 *  stays on `--primary` (the brand spark); opponents draw from a
 *  hardcoded blue / teal / violet triplet that's far from both the
 *  destructive red (hue ≈ 25) and the flinttype coral primary
 *  (hue ≈ 35), so an opponent never reads as an error and never
 *  competes with your own colour. We hardcode the OKLCH values
 *  rather than pull from `--chart-*` because community palettes
 *  shuffle those slots — one palette's `--chart-3` is destructive
 *  red, which would silently break the "never look like an error"
 *  invariant. Hand-tuned lightness 0.65–0.70 keeps the swatches
 *  readable on both light and dark surfaces. */
export function playerColorFor(id: string): string {
  switch (id) {
    case "you":
      return "var(--primary)";
    case "damiel":
      // Cobalt blue — hue 250, deep enough to differ from teal.
      return "oklch(0.65 0.18 250)";
    case "selan":
      // Teal — hue 195, well clear of both red and the coral primary.
      return "oklch(0.70 0.13 195)";
    case "kassia":
      // Violet — hue 305, distinctive against the other two.
      return "oklch(0.68 0.20 305)";
    default:
      return "var(--muted-foreground)";
  }
}
