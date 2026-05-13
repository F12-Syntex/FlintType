import { EN_COMMON_1000 } from "@/data/en-common-1000";

/** Race configuration. Each mode is a passage race — type a fixed
 *  passage; first to the line wins. Bot lineup varies per mode. */
export type RaceModeId = "1v1v1v1" | "1v1" | "sprint" | "endurance" | "quote";

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
  "1v1v1v1": {
    id: "1v1v1v1",
    name: "1V1V1V1",
    detail: "4 racers · 25 words",
    wordCount: 25,
    // Curated for variety — grandmaster, mid, rookie — so a solo
    // player faces a recognisable spectrum instead of three near-
    // identical speedsters.
    botIds: ["damiel", "elias", "onyx"],
  },
  "1v1": {
    id: "1v1",
    name: "1V1",
    detail: "head-to-head · 25 words",
    wordCount: 25,
    botIds: ["mireille"],
  },
  sprint: {
    id: "sprint",
    name: "SPRINT",
    detail: "fast-pair · 25 words",
    wordCount: 25,
    botIds: ["haru", "nadya"],
  },
  endurance: {
    id: "endurance",
    name: "ENDURANCE",
    detail: "marathon · 25 words",
    wordCount: 25,
    botIds: ["selan", "kassia"],
  },
  quote: {
    id: "quote",
    name: "QUOTE",
    // Length is set by the server (medium bracket — 101–300 chars).
    detail: "famous quote · medium length",
    wordCount: 0,
    botIds: ["elias", "mireille"],
  },
};

export const RACE_MODE_ORDER: readonly RaceModeId[] = [
  "1v1v1v1",
  "1v1",
  "sprint",
  "endurance",
  "quote",
];

/** Bot tick interval. 50ms = 20 ticks/sec, fine-grained enough to
 *  render smooth bot motion without burning the JS thread. */
export const BOT_TICK_MS = 50;
/** Trace sample interval used when the race builds the post-run
 *  summary chart. We sample once per second so the curve carries
 *  shape without bloating the snapshot array. */
export const TRACE_SAMPLE_MS = 1000;
export const COUNTDOWN_SECONDS = 3;

/** Bot definition (display mirror). The server is the source of
 *  truth — `src/server/race/bots.ts` ticks WPM + errors per room.
 *  The client copy is read by `race-online.tsx` to attach a profile
 *  to each `Racer` row so the UI can show badge / flag / colour
 *  without re-fetching anything. Keep the two in lockstep. */
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
  targetWpm: number;
  noiseWpm: number;
  rampSeconds: number;
  /** Fraction of correctly-typed chars (0..1). Server uses this for
   *  per-char error rolls during the race; client reads it only for
   *  display contexts (lobby preview, results breakdown). */
  accuracyTarget: number;
};

export const BOTS: Record<BotId, BotProfile> = {
  damiel: { id: "damiel",   name: "@damiel",   flag: "🇸🇪", badge: "GRANDMASTER", targetWpm: 188, noiseWpm: 12, rampSeconds: 3, accuracyTarget: 0.99  },
  haru:   { id: "haru",     name: "@haru",     flag: "🇯🇵", badge: "ELITE",       targetWpm: 165, noiseWpm:  8, rampSeconds: 3, accuracyTarget: 0.985 },
  nadya:  { id: "nadya",    name: "@nadya",    flag: "🇵🇱", badge: "EXPERT",      targetWpm: 142, noiseWpm: 14, rampSeconds: 4, accuracyTarget: 0.96  },
  selan:  { id: "selan",    name: "@selan",    flag: "🇨🇦", badge: "ADEPT",       targetWpm: 118, noiseWpm: 11, rampSeconds: 4, accuracyTarget: 0.95  },
  elias:  { id: "elias",    name: "@elias",    flag: "🇩🇪", badge: "ADEPT",       targetWpm:  98, noiseWpm:  9, rampSeconds: 4, accuracyTarget: 0.94  },
  mireille:{ id: "mireille",name: "@mireille", flag: "🇫🇷", badge: "STEADY",      targetWpm:  82, noiseWpm: 12, rampSeconds: 5, accuracyTarget: 0.93  },
  kassia: { id: "kassia",   name: "@kassia",   flag: "🇩🇪", badge: "STEADY",      targetWpm:  72, noiseWpm: 14, rampSeconds: 5, accuracyTarget: 0.92  },
  yusuf:  { id: "yusuf",    name: "@yusuf",    flag: "🇹🇷", badge: "ROOKIE",      targetWpm:  58, noiseWpm: 16, rampSeconds: 6, accuracyTarget: 0.9   },
  onyx:   { id: "onyx",     name: "@onyx",     flag: "🇺🇸", badge: "ROOKIE",      targetWpm:  42, noiseWpm: 18, rampSeconds: 6, accuracyTarget: 0.87  },
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
    // Per-bot colours sit on a hand-tuned wheel (hue 195–340) that
    // avoids both the destructive red (~25) and the coral primary
    // (~35), so a bot never reads as an error and never competes
    // with the user's own colour. Lightness 0.65–0.72 keeps every
    // swatch readable on light and dark surfaces.
    case "damiel":
      return "oklch(0.65 0.18 250)"; // cobalt blue
    case "haru":
      return "oklch(0.68 0.18 215)"; // sky
    case "nadya":
      return "oklch(0.68 0.20 330)"; // magenta
    case "selan":
      return "oklch(0.70 0.13 195)"; // teal
    case "elias":
      return "oklch(0.70 0.15 145)"; // moss green
    case "mireille":
      return "oklch(0.72 0.16 275)"; // periwinkle
    case "kassia":
      return "oklch(0.68 0.20 305)"; // violet
    case "yusuf":
      return "oklch(0.70 0.16 165)"; // jade
    case "onyx":
      return "oklch(0.66 0.10 240)"; // muted slate-blue
    default:
      return "var(--muted-foreground)";
  }
}
