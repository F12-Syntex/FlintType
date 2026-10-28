import type {
  BigramModelRow,
  ModelDelta,
  MotorFeatureModelRow,
  TrigramModelRow,
  WordModelRow,
} from "@/types/adapt";
import { type ModelState, staleDays, updateMany } from "./welford";

export type DeltaOptions = {
  /** Mistake-cost samples per key (see `slips.ts`). Folded in with the
   *  clean samples, but excluded from shift detection. */
  slips?: ReadonlyMap<string, readonly number[]>;
  /** Request time — enables staleness-aware learning rates. */
  nowMs?: number;
};

/** Fold an in-memory bag of new samples (per key) into the existing
 *  model state. Returns only the rows that changed — those are what
 *  the repo writes back via bulkUpsert. Keys with no prior state get
 *  seeded from the first sample. */
export function deltasFor(
  existing: ReadonlyMap<string, ModelState>,
  samples: ReadonlyMap<string, readonly number[]>,
  opts: DeltaOptions = {},
): Map<string, ModelDelta> {
  const out = new Map<string, ModelDelta>();
  const keys = new Set<string>(samples.keys());
  if (opts.slips) for (const k of opts.slips.keys()) keys.add(k);
  for (const key of keys) {
    const clean = samples.get(key) ?? [];
    const slips = opts.slips?.get(key) ?? [];
    if (clean.length === 0 && slips.length === 0) continue;
    const prev = existing.get(key) ?? null;
    const next = updateMany(prev, interleave(clean, slips), {
      staleDays: staleDays(prev?.lastSeenMs, opts.nowMs),
      shiftEvidence: clean,
    });
    if (!next) continue;
    out.set(key, {
      meanMs: next.mean,
      varianceMs: next.variance,
      sampleCount: next.n,
    });
  }
  return out;
}

/** Spread `extra` evenly through `base` (each list's own order is
 *  preserved). The EWMA weights later samples slightly more, so
 *  appending all the slip costs at the end of a test would over-count
 *  them; spacing them through the clean samples approximates their real
 *  chronology. Both lists are placed at evenly spaced fractional
 *  positions — item i of n at (i + 1) / (n + 1) — and merged, so the
 *  spread stays even whichever list is longer. */
export function interleave(
  base: readonly number[],
  extra: readonly number[],
): number[] {
  if (extra.length === 0) return [...base];
  if (base.length === 0) return [...extra];
  const out: number[] = [];
  let bi = 0;
  let ei = 0;
  while (bi < base.length || ei < extra.length) {
    const bPos = bi < base.length ? (bi + 1) / (base.length + 1) : Infinity;
    const ePos = ei < extra.length ? (ei + 1) / (extra.length + 1) : Infinity;
    if (bPos <= ePos) out.push(base[bi++]!);
    else out.push(extra[ei++]!);
  }
  return out;
}

// ─── Row-shaped → ModelState views ────────────────────────────────────
// The repos return rows with snake-cased timing fields; the algorithm
// works in ModelState. These adapters keep the conversion centralised.
// `updatedAt` is stamped by bulkUpsert only for keys that received
// samples, so it doubles as "last practised" for staleness.

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

export function wordRowsToStates(
  rows: readonly WordModelRow[],
): Map<string, ModelState> {
  return rowsToStates(rows, (r) => r.word);
}

type StatRow = {
  meanMs: number;
  varianceMs: number;
  sampleCount: number;
  updatedAt?: Date | null;
};

function rowsToStates<R extends StatRow>(
  rows: readonly R[],
  keyOf: (row: R) => string,
): Map<string, ModelState> {
  const out = new Map<string, ModelState>();
  for (const r of rows) {
    const seen = r.updatedAt?.getTime();
    out.set(keyOf(r), {
      mean: r.meanMs,
      variance: r.varianceMs,
      n: r.sampleCount,
      ...(seen != null && Number.isFinite(seen) ? { lastSeenMs: seen } : {}),
    });
  }
  return out;
}
