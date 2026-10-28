import { z } from "zod";

/** Per-second chart samples a `done` frame may carry: the regular
 *  `wpmHistory`, or a burst run's buckets. One hour of run; the
 *  broadcaster keeps the latest samples past that so a marathon run
 *  never pushes a frame the schema rejects. */
export const LIVE_MAX_CHART_SAMPLES = 3_600;

/** Generous: a burst try's speed is its length over its own time, so a
 *  short item typed very fast reads far above any whole-run speed. */
const speed = z.number().min(0).max(1_000_000);
const count = z.number().int().min(0).max(1_000_000);

/** A finished BURST run's result figures, sent on the broadcaster's
 *  `done` frame so the spectator's clone shows the same "Burst WPM",
 *  caption, "Raw (all N tries)", consistency and chart as the
 *  broadcaster's results screen. Precomputed from the run's try log
 *  (`burstResult` in burst-stats.ts) rather than sending every try: a
 *  summary plus one chart sample per second, sized like `wpmHistory`.
 *  Mirrors the `BurstResult` shape the results screen reads. */
export const liveBurstSchema = z.object({
  summary: z.object({
    wpm: speed,
    raw: speed,
    best: speed,
    slowest: speed,
    consistency: z.number().min(0).max(100),
    cleared: count,
    tries: count,
  }),
  buckets: z
    .array(z.object({ sec: count, wpm: speed, raw: speed }))
    .max(LIVE_MAX_CHART_SAMPLES),
});

export type LiveBurst = z.infer<typeof liveBurstSchema>;

/** Wire form: optional, and an invalid block drops to `undefined` (the
 *  clone falls back to the regular figures) instead of rejecting the
 *  whole progress push, so an old or drifted client still streams. */
export const liveBurstWireSchema = liveBurstSchema.optional().catch(undefined);
