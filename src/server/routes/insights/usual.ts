import { assembleUsual } from "@/lib/typing-analysis/pooled/usual-reference";
import { defineRoute } from "@/server";
import { rateLimit } from "@/server/middleware/rate-limit";
import { insightsUsualInputSchema, type InsightsUsualInput, type InsightsUsualOutput } from "@/types/insights";
import { loadUsualData } from "./load";

/** The last millisecond of year 9999. A larger `beforeMs` passes the
 *  schema but breaks `new Date()` or Postgres, and means "before
 *  everything" just as well. */
export const MAX_BEFORE_MS = Date.UTC(9999, 11, 31, 23, 59, 59, 999);

/** The reference for the result screen's comparison (spec-30 §6.3): this
 *  bucket's tests that started before `beforeMs`, never the current one. */
export const usual = defineRoute<InsightsUsualInput, InsightsUsualOutput>({
  input: insightsUsualInputSchema,
  middleware: [rateLimit({ limit: 40, windowMs: 60_000 })],
  handler: async (ctx) => {
    const input = { ...ctx.input, beforeMs: Math.min(ctx.input.beforeMs, MAX_BEFORE_MS) };
    const data = await loadUsualData(ctx, input);
    return assembleUsual({ rows: data.rows, index: data.index, digests: data.digests, input, nowMs: Date.now() });
  },
});
