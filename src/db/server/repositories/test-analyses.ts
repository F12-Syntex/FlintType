import { and, desc, eq, inArray, lt, sql, type SQL } from "drizzle-orm";
import { testAnalyses } from "@/db/schema/server/test-analyses";
import type {
  NewTestAnalysisRow,
  StoredTestAnalysis,
  TestAnalysisIndexRow,
} from "@/types/test-analysis";
import type { ServerDrizzle } from "../driver";

/** The digest's passage difficulty (TestDigestV1.diff) straight from the
 *  jsonb, without loading the digest. A JSON null or a non-number reads
 *  as SQL NULL, so a malformed row can't fail the whole index read. */
const diffColumn = sql<number | null>`CASE WHEN jsonb_typeof(${testAnalyses.digest}->'diff') = 'number'
  THEN (${testAnalyses.digest}->>'diff')::double precision END`;

/** A driver may hand back a numeric column as a string; anything that
 *  isn't a finite number reads as null. */
function toDiff(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Per-test analysis digests (spec-30 §2.1). Written only by
 *  recordTestAnalysis (src/server/routes/adapt/record-analysis.ts); read
 *  by the insights routes. Every read is newest first. */
export function testAnalysesRepo(db: ServerDrizzle) {
  return {
    /** Idempotent: a retried submit can't create a second row. */
    async insert(row: NewTestAnalysisRow): Promise<void> {
      await db
        .insert(testAnalyses)
        .values(row)
        .onConflictDoNothing({ target: testAnalyses.testId });
    },

    /** test_id, bucket and the digest's difficulty only, so every analysed
     *  test can be bucketed and Adapt-adjusted without loading digests. */
    async indexForUser(userId: string, limit: number): Promise<TestAnalysisIndexRow[]> {
      const rows = await db
        .select({ testId: testAnalyses.testId, bucket: testAnalyses.bucket, diff: diffColumn })
        .from(testAnalyses)
        .where(eq(testAnalyses.userId, userId))
        .orderBy(desc(testAnalyses.startedAt), desc(testAnalyses.testId))
        .limit(limit);
      return rows.map((r) => ({ testId: r.testId, bucket: r.bucket, diff: toDiff(r.diff) }));
    },

    /** Optional bucket filter (one `bucket`, or any of `buckets`; an empty
     *  list matches nothing); optional beforeMs excludes rows that started
     *  at or after it. */
    async listForUser(
      userId: string,
      opts: { limit: number; bucket?: string; buckets?: readonly string[]; beforeMs?: number },
    ): Promise<StoredTestAnalysis[]> {
      const where: SQL[] = [eq(testAnalyses.userId, userId)];
      if (opts.bucket !== undefined) where.push(eq(testAnalyses.bucket, opts.bucket));
      if (opts.buckets !== undefined) {
        if (opts.buckets.length === 0) return [];
        where.push(inArray(testAnalyses.bucket, [...opts.buckets]));
      }
      if (opts.beforeMs !== undefined) where.push(lt(testAnalyses.startedAt, new Date(opts.beforeMs)));
      return db
        .select({
          testId: testAnalyses.testId,
          startedAt: testAnalyses.startedAt,
          bucket: testAnalyses.bucket,
          version: testAnalyses.version,
          digest: testAnalyses.digest,
        })
        .from(testAnalyses)
        .where(and(...where))
        .orderBy(desc(testAnalyses.startedAt), desc(testAnalyses.testId))
        .limit(opts.limit);
    },

    /** Every digest the user has. Returns how many rows went. Raw SQL so
     *  RETURNING sends back ids only (the builder's typed `returning`
     *  isn't available on the driver union), never the digests. */
    async deleteForUser(userId: string): Promise<number> {
      const raw = await db.execute(
        sql`DELETE FROM ${testAnalyses} WHERE ${testAnalyses.userId} = ${userId} RETURNING ${testAnalyses.testId}`,
      );
      const rows = (raw.rows ?? raw) as unknown[];
      return rows.length;
    },
  };
}

export type TestAnalysesRepo = ReturnType<typeof testAnalysesRepo>;
