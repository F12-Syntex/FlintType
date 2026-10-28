import { consistencyScore } from "@/lib/wpm-stats";

/** Result figures for a BURST run. Pure, so the maths is unit-tested
 *  (burst-stats.test.ts) and the results screen only formats.
 *
 *  The regular result figures time the whole run from the first key to
 *  the last commit and count only the words that were finally committed,
 *  so a burst run (every item typed again and again, with a pause after
 *  each try) read "31 WPM" next to "Raw 135". Here every figure is timed
 *  on the tries themselves, the same clock the live "last wpm" readout
 *  uses: from a try's first key to the key that ended it. */

/** One burst try, recorded by BurstProvider when it ends. */
export type BurstTry = {
  /** ms since the run's clock started, when the try ended. */
  endT: number;
  /** ms from the try's first key to the key that ended it. */
  ms: number;
  /** Character keys pressed during the try, the first one included. */
  keys: number;
  /** Length of the item being typed. Counts toward speed only when
   *  the try cleared. */
  chars: number;
  /** True when space ended the try (a commit attempt). False when a
   *  wrong key or a Tab retry cut it short. */
  endedBySpace: boolean;
  /** Typed correctly and at or above the goal speed. */
  cleared: boolean;
};

export type BurstSummary = {
  /** Speed over the cleared tries: their characters over their time. */
  wpm: number;
  /** Speed over every try (misses, slow and abandoned tries included):
   *  every timed key over the time spent on all of them. */
  raw: number;
  /** Fastest single cleared try. */
  best: number;
  /** Slowest single cleared try. */
  slowest: number;
  /** 0–100 evenness of the cleared tries' speeds. */
  consistency: number;
  cleared: number;
  tries: number;
};

export type BurstBucket = { sec: number; wpm: number; raw: number };

/** wpm = (chars / 5) per minute = chars · 60 000 / 5 / ms. */
const WPM_PER_CHAR_PER_MS = 12_000;

/** Speed of `chars` characters typed in `ms`, in WPM. Same formula as
 *  the live "last wpm" readout. */
export function burstSpeed(chars: number, ms: number): number {
  if (ms <= 0 || chars <= 0) return 0;
  return (chars * WPM_PER_CHAR_PER_MS) / ms;
}

/** Keys that carry a measured time. The first key only starts the
 *  clock, and the closing space is the last timed keystroke, so a clean
 *  try that space ended counts exactly its length (raw equals its
 *  speed) while a try cut short by a wrong key counts one key fewer. */
export function timedKeys(t: BurstTry): number {
  return Math.max(0, t.keys - 1 + (t.endedBySpace ? 1 : 0));
}

function totals(tries: readonly BurstTry[]) {
  let clearedChars = 0;
  let clearedMs = 0;
  let keys = 0;
  let ms = 0;
  let cleared = 0;
  for (const t of tries) {
    keys += timedKeys(t);
    ms += t.ms;
    if (t.cleared) {
      cleared += 1;
      clearedChars += t.chars;
      clearedMs += t.ms;
    }
  }
  return {
    cleared,
    wpm: burstSpeed(clearedChars, clearedMs),
    raw: burstSpeed(keys, ms),
  };
}

/** Roll a run's tries up into the result figures. `null` while no try
 *  has cleared (nothing honest to headline yet). */
export function summariseBursts(
  tries: readonly BurstTry[],
): BurstSummary | null {
  const speeds = tries
    .filter((t) => t.cleared)
    .map((t) => burstSpeed(t.chars, t.ms));
  if (speeds.length === 0) return null;
  const { wpm, raw } = totals(tries);
  return {
    wpm,
    raw,
    best: Math.max(...speeds),
    slowest: Math.min(...speeds),
    consistency: consistencyScore(speeds.map((s) => ({ wpm: s }))),
    cleared: speeds.length,
    tries: tries.length,
  };
}

/** Per-second chart series on the run's clock: at each second, the
 *  burst speed and raw speed of the tries that had ended by then, the
 *  same running figure the regular chart plots. The last second takes
 *  every try so the line ends on the headline number.
 *
 *  The series starts at second 1 like a regular run's, so the mistakes
 *  ribbon and the ✕ marks cover the misses that open a run. Seconds
 *  before the first cleared try (no burst speed yet) carry its value
 *  back, and seconds before any try ended carry back the first raw
 *  value, so the lines start level instead of dropping to zero. */
export function burstBuckets(tries: readonly BurstTry[]): BurstBucket[] {
  if (tries.length === 0) return [];
  const lastEnd = tries.reduce((m, t) => Math.max(m, t.endT), 0);
  const lastSec = Math.max(1, Math.round(lastEnd / 1000));
  const rows: { sec: number; wpm: number | null; raw: number | null }[] = [];
  for (let sec = 1; sec <= lastSec; sec += 1) {
    const cutoff = sec === lastSec ? Number.POSITIVE_INFINITY : sec * 1000;
    const upTo = tries.filter((t) => t.endT <= cutoff);
    const { cleared, wpm, raw } = totals(upTo);
    rows.push({
      sec,
      wpm: cleared > 0 ? round1(wpm) : null,
      raw: upTo.length > 0 ? round1(raw) : null,
    });
  }
  const firstWpm = rows.find((r) => r.wpm != null)?.wpm ?? 0;
  const firstRaw = rows.find((r) => r.raw != null)?.raw ?? 0;
  return rows.map((r) => ({
    sec: r.sec,
    wpm: r.wpm ?? firstWpm,
    raw: r.raw ?? firstRaw,
  }));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Everything the results screen shows for a burst run. */
export type BurstResult = { summary: BurstSummary; buckets: BurstBucket[] };

/** A run's figures and chart series in one call, so the results screen
 *  and the live broadcast (which sends them to spectators) agree. `null`
 *  while no try has cleared, like `summariseBursts`. */
export function burstResult(tries: readonly BurstTry[]): BurstResult | null {
  const summary = summariseBursts(tries);
  return summary ? { summary, buckets: burstBuckets(tries) } : null;
}

/** The line under a burst headline saying what the number is (the
 *  speed over cleared tries, not a mean of them) and, when some tries
 *  didn't clear, why Raw comes out lower: it counts those too. `best`
 *  is already formatted in the user's unit. */
export function burstCaption(
  b: Pick<BurstSummary, "cleared" | "tries">,
  best: string,
  unitLabel: string,
): string {
  const lead =
    b.cleared === 1
      ? "Speed of your one cleared burst."
      : `Speed across your ${b.cleared} cleared bursts. Best ${best} ${unitLabel}.`;
  const missed = b.tries - b.cleared;
  if (missed <= 0) return lead;
  return `${lead} Raw also counts the ${missed} ${missed === 1 ? "try" : "tries"} that didn't clear.`;
}
