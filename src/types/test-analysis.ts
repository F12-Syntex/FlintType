export type { TestAnalysisRow, NewTestAnalysisRow } from "@/db/schema/server/test-analyses";

/** One entry of the light per-user index (db.testAnalyses.indexForUser):
 *  enough to bucket and Adapt-adjust every analysed test without loading
 *  its digest. `diff` is the digest's passage difficulty, or null. */
export type TestAnalysisIndexRow = { testId: string; bucket: string; diff: number | null };

/** A stored digest as listForUser returns it. `digest` is unparsed jsonb:
 *  readers run it through parseDigest (src/lib/typing-analysis/digest.ts). */
export type StoredTestAnalysis = {
  testId: string;
  startedAt: Date;
  bucket: string;
  version: number;
  digest: unknown;
};
