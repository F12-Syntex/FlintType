import type { PersonalBest } from "./derive-stats";

/** The length unit a personal-bests strip shows. */
export type BestsUnit = "time" | "words";

/** The standard lengths the Personal bests section shows a tile for. */
export const TIME_AMOUNTS = [15, 30, 60, 120] as const;
export const WORDS_AMOUNTS = [10, 25, 50, 100] as const;

export const UNIT_AMOUNTS: Record<BestsUnit, readonly number[]> = {
  time: TIME_AMOUNTS,
  words: WORDS_AMOUNTS,
};

/** The Personal bests mode switch. `practice` is labelled "Adapt" and
 *  covers both adaptive modes (they fold into `training`). */
export type BestsCategory = "all" | "casual" | "practice" | "multiplayer";

export const CATEGORY_MODES: Record<BestsCategory, readonly string[]> = {
  all: ["casual", "training", "race"],
  casual: ["casual"],
  multiplayer: ["race"],
  practice: ["training"],
};

/** Which strip a run of `amount` with `lengthMode` belongs in, or null
 *  when it has no tile (a quote, or a non-standard length). Rows with
 *  no unit (legacy tests, the MonkeyType overlay) land in the strip
 *  whose standard lengths hold their amount, since the two strips'
 *  lengths don't overlap. */
export function stripUnitFor(
  lengthMode: PersonalBest["lengthMode"],
  amount: number,
): BestsUnit | null {
  if (lengthMode === "time" || lengthMode === "words") {
    return UNIT_AMOUNTS[lengthMode].includes(amount) ? lengthMode : null;
  }
  if (lengthMode != null) return null;
  if (TIME_AMOUNTS.some((a) => a === amount)) return "time";
  if (WORDS_AMOUNTS.some((a) => a === amount)) return "words";
  return null;
}

/** Index personal bests for one strip (Time or Words), keeping the
 *  highest WPM per amount across the allowed modes.
 *
 *  - Rows tagged with the other unit, or a quote, never leak in: a
 *    60-word run must not show up as a 60-second best.
 *  - Rows with no unit (`lengthMode: null` — legacy tests and the
 *    MonkeyType overlay) land in the strip whose `amounts` list holds
 *    their amount, since the two strips' amounts don't overlap. */
export function indexBestsByAmount(
  bests: readonly PersonalBest[],
  opts: {
    modes: readonly string[];
    unit: BestsUnit;
    amounts: readonly number[];
  },
): Map<number, PersonalBest> {
  const allowedModes = new Set(opts.modes);
  const homeAmounts = new Set(opts.amounts);
  const out = new Map<number, PersonalBest>();
  for (const b of bests) {
    if (!allowedModes.has(b.mode)) continue;
    const inStrip =
      b.lengthMode === opts.unit ||
      (b.lengthMode == null && homeAmounts.has(b.amount));
    if (!inStrip) continue;
    const existing = out.get(b.amount);
    if (!existing || b.bestWpm > existing.bestWpm) out.set(b.amount, b);
  }
  return out;
}
