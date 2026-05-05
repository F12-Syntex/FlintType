import type {
  BigramModelRow,
  ModelDelta,
  MotorFeatureModelRow,
  TrigramModelRow,
} from "@/types/adapt";
import { type ModelState, updateMany } from "./welford";

/** Fold an in-memory bag of new samples (per key) into the existing
 *  model state. Returns only the rows that changed — those are what
 *  the repo writes back via bulkUpsert. Keys with no prior state get
 *  seeded from the first sample. */
export function deltasFor(
  existing: ReadonlyMap<string, ModelState>,
  samples: ReadonlyMap<string, readonly number[]>,
): Map<string, ModelDelta> {
  const out = new Map<string, ModelDelta>();
  for (const [key, vs] of samples) {
    if (vs.length === 0) continue;
    const prev = existing.get(key) ?? null;
    const next = updateMany(prev, vs);
    if (!next) continue;
    out.set(key, {
      meanMs: next.mean,
      varianceMs: next.variance,
      sampleCount: next.n,
    });
  }
  return out;
}

// ─── Row-shaped → ModelState views ────────────────────────────────────
// The repos return rows with snake-cased timing fields; the algorithm
// works in ModelState. These adapters keep the conversion centralised.

export function bigramRowsToStates(
  rows: readonly BigramModelRow[],
): Map<string, ModelState> {
  return rowsToStates(rows, (r) => r.bigram);
}

export function trigramRowsToStates(
  rows: readonly TrigramModelRow[],
): Map<string, ModelState> {
  return rowsToStates(rows, (r) => r.trigram);
}

export function motorFeatureRowsToStates(
  rows: readonly MotorFeatureModelRow[],
): Map<string, ModelState> {
  return rowsToStates(rows, (r) => r.featureKey);
}

type StatRow = { meanMs: number; varianceMs: number; sampleCount: number };

function rowsToStates<R extends StatRow>(
  rows: readonly R[],
  keyOf: (row: R) => string,
): Map<string, ModelState> {
  const out = new Map<string, ModelState>();
  for (const r of rows) {
    out.set(keyOf(r), {
      mean: r.meanMs,
      variance: r.varianceMs,
      n: r.sampleCount,
    });
  }
  return out;
}
