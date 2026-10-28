import type { PersonalBest } from "./derive-stats";

/** The length unit a personal-bests strip shows. */
export type BestsUnit = "time" | "words";

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
