import type { Database } from "@/db/server";
import { parseDigest } from "@/lib/typing-analysis/digest";
import { referenceDigestQuery } from "@/lib/typing-analysis/pooled/usual-reference";
import { bucketOptions, chooseBucket, toPooled, type AnalysisIndex } from "@/lib/typing-analysis/pooled/windows";
import type { RouteContext } from "@/server";
import { isMissingTable } from "@/server/db-errors";
import type { Logger } from "@/server/logger";
import type { InsightsData, TestSummaryRow } from "@/types/insights";
import type { TestDigestV1 } from "@/types/typing-analysis";

/** The newest tests the analysis reads (and the newest analysed tests in
 *  the light index). */
export const INSIGHTS_ROWS = 500;
const TABLE = "test_analyses";

type Ctx = { db: Database; meta: RouteContext["meta"]; log: Logger };
type Digests = Map<string, TestDigestV1> | "unavailable";

/** Runs a test_analyses read; a missing table (an unmigrated dev DB)
 *  gives null, any other error is rethrown (an INTERNAL 500). */
async function orMissing<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (err) {
    if (isMissingTable(err, TABLE)) return null;
    throw err;
  }
}

/** The tests projection and the light analysis index, read together.
 *  `index` is null when the analysis table is missing. */
async function loadRowsAndIndex(ctx: Ctx, beforeMs?: number): Promise<{ rows: TestSummaryRow[]; index: AnalysisIndex | null }> {
  const userId = ctx.meta.userId as string;
  const [rows, indexRows] = await Promise.all([
    ctx.db.testSummaries.recentForUser(userId, INSIGHTS_ROWS, beforeMs),
    orMissing(() => ctx.db.testAnalyses.indexForUser(userId, INSIGHTS_ROWS)),
  ]);
  if (indexRows === null) {
    ctx.log.debug("insights: analysis store missing", { userId });
    return { rows, index: null };
  }
  return { rows, index: new Map(indexRows.map((r) => [r.testId, { bucket: r.bucket, diff: r.diff }])) };
}

/** One bucket's digests, newest first, before `beforeMs` when given. */
async function loadDigests(ctx: Ctx, bucket: string, q: { limit: number; beforeMs?: number }): Promise<Digests> {
  const stored = await orMissing(() => ctx.db.testAnalyses.listForUser(ctx.meta.userId as string,
    { bucket, limit: q.limit, beforeMs: q.beforeMs }));
  if (stored === null) return "unavailable";
  const out = new Map<string, TestDigestV1>();
  for (const row of stored) {
    const d = parseDigest(row.digest);
    if (d) out.set(row.testId, d);
  }
  return out;
}

/** What `insights.overview` reads for the signed-in user only (spec-30
 *  §6.2): three indexed reads at most (tests, the analysis index, one
 *  bucket's newest digests), never a Clerk call. The bucket is the
 *  requested one when it has an eligible test, else the default. */
export async function loadInsightsData(ctx: Ctx, opts: { bucket?: string; digestsLimit: number }): Promise<InsightsData> {
  const { rows, index } = await loadRowsAndIndex(ctx);
  const chosenBucket = chooseBucket(bucketOptions(toPooled(rows, index ?? new Map(), new Map()), Date.now()), Date.now(), opts.bucket);
  if (index === null) return { rows, index: new Map(), digests: "unavailable", chosenBucket };
  const digests = chosenBucket === null || rows.length === 0
    ? new Map<string, TestDigestV1>()
    : await loadDigests(ctx, chosenBucket, { limit: opts.digestsLimit });
  return { rows, index, digests, chosenBucket };
}

/** What `insights.usual` reads (spec-30 §6.3): the tests before
 *  `beforeMs`, the index, and the digests of the reference window itself
 *  (spec-10 §13.11 step 4), found from the rows first. The bucket is used
 *  as given. Three indexed reads at most, never a Clerk call. */
export async function loadUsualData(ctx: Ctx, input: { bucket: string; beforeMs: number }): Promise<InsightsData> {
  const { rows, index } = await loadRowsAndIndex(ctx, input.beforeMs);
  if (index === null) return { rows, index: new Map(), digests: "unavailable", chosenBucket: input.bucket };
  const q = referenceDigestQuery(rows, index, input.bucket, input.beforeMs);
  const digests = q === null ? new Map<string, TestDigestV1>() : await loadDigests(ctx, input.bucket, q);
  return { rows, index, digests, chosenBucket: input.bucket };
}
