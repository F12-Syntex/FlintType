import { XP_PER_TEST, levelFromXp } from "@/lib/level";
import type { PublicMonkeytypeStats } from "@/types/history";
import type { PersonalBest, ProfileTotals } from "./derive-stats";

/** Either flavour of MT slice the merge layer accepts — the private
 *  owner slice carrying the encrypted Ape Key, or the public subset
 *  the history route returns to visitors. The merges never touch
 *  the credential field, so structurally they're interchangeable. */
type MtMergeInput = PublicMonkeytypeStats;

/** Combine local lifetime totals with the latest MT import snapshot.
 *  Counters add (local + mt); best-WPM takes the max; level reflects
 *  the combined completed-test count. Treats `mt` as a snapshot —
 *  re-importing replaces the snapshot, so counts don't compound. */
export function mergeTotalsWithMt(
  local: ProfileTotals,
  mt: MtMergeInput | null,
): ProfileTotals {
  if (!mt) return local;
  const mtCompleted = Number(mt.completedTests ?? 0);
  const mtStarted = Number(mt.startedTests ?? 0);
  const mtTime = Number(mt.timeTyping ?? 0);
  const mtBestWpm = Math.max(
    0,
    ...Object.values(mt.pbs.time).map((p) => p.wpm),
    ...Object.values(mt.pbs.words).map((p) => p.wpm),
  );
  // Recompute the combined level from the merged completed-test
  // count so a fresh MT import nudges the level bar forward. Drills
  // / races XP already lives inside `local.totalXp` (test XP component
  // is recomputed from the combined count below); we add MT's
  // contribution as additional test XP. Same `levelFromXp` helper as
  // the local-only path so the two never drift.
  const combinedCompleted = local.testsCompleted + mtCompleted;
  const nonTestXp = local.totalXp - local.testsCompleted * XP_PER_TEST;
  const { level, totalXp, xpIntoLevel, progress } = levelFromXp(
    combinedCompleted * XP_PER_TEST + nonTestXp,
  );
  return {
    ...local,
    testsStarted: local.testsStarted + mtStarted,
    testsCompleted: combinedCompleted,
    completionRate:
      local.testsStarted + mtStarted > 0
        ? combinedCompleted / (local.testsStarted + mtStarted)
        : 0,
    totalSeconds: local.totalSeconds + mtTime,
    bestWpm: Math.max(local.bestWpm, mtBestWpm),
    level,
    totalXp,
    xpIntoLevel,
    levelProgress: progress,
  };
}

/** Overlay MT personal bests onto the local-derived list. The
 *  contract: flinttype data is *additive* — a stronger local PB
 *  is never overridden. For each (mode, length) cell, the higher
 *  WPM wins. Local mode names are algorithmic (training/casual);
 *  MT only knows the player-mode time/words distinction, so MT PBs
 *  surface under the casual row (flinttype's default-shown mode).
 *
 *    local.wpm ≥ mt.wpm  → keep local (no change)
 *    local.wpm <  mt.wpm  → bump local cell to mt.wpm + mt.acc
 *    no local cell at this length → push the MT cell
 *
 *  Re-imports replace the MT snapshot but never the local rows, so
 *  flinttype-side bests accumulate independently of MT. */
export function mergePersonalBestsWithMt(
  local: PersonalBest[],
  mt: MtMergeInput | null,
): PersonalBest[] {
  if (!mt) return local;
  const out = [...local];
  const seen = new Set(out.map((b) => `${b.mode}|${b.amount}`));
  function maybeAdd(entries: Record<string, { wpm: number; acc: number }>) {
    for (const [key, pb] of Object.entries(entries)) {
      const amount = Number(key);
      if (!Number.isFinite(amount)) continue;
      const composite = `casual|${amount}`;
      if (seen.has(composite)) {
        // Take the MAX — local stays winner when local.wpm >= mt.wpm.
        const existing = out.find(
          (b) => b.mode === "casual" && b.amount === amount,
        );
        if (existing && pb.wpm > existing.bestWpm) {
          existing.bestWpm = pb.wpm;
          existing.bestAccuracy = pb.acc;
        }
      } else {
        out.push({
          mode: "casual",
          amount,
          // MT only knows the time/words distinction implicitly via the
          // pbs.time / pbs.words split; the merge keys on (mode, amount)
          // alone, so leave the discriminator null on overlay rows.
          lengthMode: null,
          bestWpm: pb.wpm,
          bestAccuracy: pb.acc,
          testsCount: 0, // MT PBs aren't backed by individual local rows
        });
        seen.add(composite);
      }
    }
  }
  maybeAdd(mt.pbs.time);
  maybeAdd(mt.pbs.words);
  return out;
}
