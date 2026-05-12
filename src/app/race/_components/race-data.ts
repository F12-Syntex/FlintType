import { EN_COMMON_1000 } from "@/data/en-common-1000";

/** Race configuration. Today only 1V3 ships fully wired; other modes
 *  show as visual chips in the sidebar but aren't selectable. The
 *  shape is in place so adding 1V1 / sprint later is a data change. */
export type RaceMode = "1v3";

export const RACE_WORDS_1V3 = 50;
export const COUNTDOWN_SECONDS = 3;
/** Bot tick interval. 50ms = 20 ticks/sec, fine-grained enough to
 *  render smooth bot motion without burning the JS thread. */
export const BOT_TICK_MS = 50;
/** Trace sample interval. One point per second per racer. */
export const TRACE_SAMPLE_MS = 1000;
/** Rolling window over which your live WPM is averaged. */
export const WPM_WINDOW_MS = 5000;

/** Deterministic bot definition. Bots are local opponents — no
 *  network, no server-side state. Each bot has a steady-state target
 *  WPM, a per-tick noise band so the trace line looks organic
 *  (instead of arrow-straight), and a short ramp-up at the start so
 *  nobody starts at full speed the instant GO fires. */
export type BotProfile = {
  id: string;
  name: string;
  flag: string;
  badge: string;
  /** Steady-state target words per minute. */
  targetWpm: number;
  /** Symmetric noise band: instantaneous wpm jitters in
   *  [target - noise, target + noise] each tick. */
  noiseWpm: number;
  /** Seconds the bot spends accelerating from 50% target to full
   *  speed at race start. Stops bots reading like robots. */
  rampSeconds: number;
};

export const BOTS_1V3: readonly BotProfile[] = [
  {
    id: "damiel",
    name: "@damiel",
    flag: "🇸🇪",
    badge: "GRANDMASTER",
    targetWpm: 188,
    noiseWpm: 14,
    rampSeconds: 3,
  },
  {
    id: "selan",
    name: "@selan",
    flag: "🇨🇦",
    badge: "EXPERT",
    targetWpm: 128,
    noiseWpm: 9,
    rampSeconds: 4,
  },
  {
    id: "kassia",
    name: "@kassia",
    flag: "🇩🇪",
    badge: "ADEPT",
    targetWpm: 78,
    noiseWpm: 6,
    rampSeconds: 5,
  },
] as const;

/** Deterministic mulberry32 PRNG — small, fast, and identical on
 *  server and client. Seeded so SSR's rendered passage matches the
 *  client hydration pass, which avoids the words flashing through
 *  one order before settling on another. */
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

/** Pull `count` words from the top-1000 list with a seeded RNG. We
 *  draw from positions 0..299 (the very-common slice) so the
 *  passage feels like fluent prose — racing on rare words turns
 *  every race into a vocab test. */
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

/** Cumulative WPM since race start. Used for the human racer's lane
 *  display + the passage readout — bots use `instantBotWpm` instead so
 *  their lane jitters around the target value. */
export function cumulativeWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs < 250) return 0;
  return (correctChars / 5) * (60_000 / elapsedMs);
}

/** A bot's instantaneous WPM at time `elapsedMs` into the race —
 *  ramp + noise. Driven by a per-bot RNG seeded by raceSeed + bot
 *  id so two runs with the same race seed reproduce identical bots
 *  (helpful for replays / tests / "ghost" feature later). */
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
  // Hash bot id into a stable seed so two bots in the same race
  // don't share a jitter pattern.
  let h = raceSeed | 0;
  for (let i = 0; i < bot.id.length; i++) h = (h * 31 + bot.id.charCodeAt(i)) | 0;
  const rng = mulberry32(h ^ Math.floor(elapsedMs / 100));
  const jitter = (rng() * 2 - 1) * bot.noiseWpm;
  return Math.max(20, base + jitter);
}
