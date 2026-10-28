import type { HistoryTest } from "@/types/history";
import { normalizeMode, type PersonalBest } from "./derive-stats";
import {
  CATEGORY_MODES,
  UNIT_AMOUNTS,
  indexBestsByAmount,
  stripUnitFor,
} from "./personal-best-lookup";

/** Ids of the runs that deserve a record crown in Recent runs.
 *
 *  A crown means "this is the number in your Personal bests", so it
 *  mirrors that section's default All view exactly:
 *
 *  - only standard tile lengths (Time 15/30/60/120, Words 10/25/50/100);
 *    quotes and race passages of arbitrary length never crown;
 *  - keyed by unit + length across every mode the All view counts
 *    (casual, both adaptive modes, races);
 *  - a length with a single finished run is not a record yet;
 *  - when the merged bests (e.g. a MonkeyType import) beat every local
 *    run at that length, no local run crowns. */
export function pickRecordRunIds(
  tests: readonly HistoryTest[],
  bests?: readonly PersonalBest[],
): Set<string> {
  const allModes = new Set(CATEGORY_MODES.all);
  const groups = new Map<string, { best: HistoryTest; count: number }>();
  for (const t of tests) {
    if (!t.wasCompleted) continue;
    if (!allModes.has(normalizeMode(t.mode))) continue;
    const unit = stripUnitFor(t.lengthMode, t.durationOrWordCount);
    if (!unit) continue;
    const key = `${unit}|${t.durationOrWordCount}`;
    const cur = groups.get(key);
    if (!cur) groups.set(key, { best: t, count: 1 });
    else {
      cur.count += 1;
      if (t.wpm > cur.best.wpm) cur.best = t;
    }
  }

  const tiles = bests
    ? {
        time: indexBestsByAmount(bests, {
          modes: CATEGORY_MODES.all,
          unit: "time",
          amounts: UNIT_AMOUNTS.time,
        }),
        words: indexBestsByAmount(bests, {
          modes: CATEGORY_MODES.all,
          unit: "words",
          amounts: UNIT_AMOUNTS.words,
        }),
      }
    : null;

  const out = new Set<string>();
  for (const [key, { best, count }] of groups) {
    if (count < 2) continue;
    if (tiles) {
      const unit = key.startsWith("time|") ? "time" : "words";
      const tile = tiles[unit].get(best.durationOrWordCount);
      if (tile && tile.bestWpm > best.wpm) continue;
    }
    out.add(best.id);
  }
  return out;
}
