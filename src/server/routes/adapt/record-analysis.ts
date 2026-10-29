import type { Database } from "@/db/server";
import { DEFAULT_HAND_LAYOUT, type HandLayoutPrefs } from "@/lib/hand-layout";
import { runBucketKey } from "@/lib/test-bucket";
import { analyseRun } from "@/lib/typing-analysis/analyse";
import { digestContext, inputKindOf } from "@/lib/typing-analysis/context";
import { buildDigest } from "@/lib/typing-analysis/digest";
import { submitToRunInput } from "@/lib/typing-analysis/from-submit";
import { passageDifficulty } from "@/server/adapt/difficulty";
import { fingerMapHash } from "@/server/adapt/key-map";
import type { ModelMap } from "@/server/adapt/scoring";
import { isMissingTable } from "@/server/db-errors";
import type { Logger } from "@/server/logger";
import { weakestPatterns } from "@/server/weakest-patterns";
import type { SubmitTestInput } from "@/types/adapt";
import type { RunAnalysis } from "@/types/typing-analysis";

/** The user's 8 weakest letter pairs are tracked in every digest, so the
 *  pooled "what changed" can compare them before and after. */
const TRACKED_PAIRS = 8;

export type RecordAnalysisArgs = {
  db: Database;
  log: Logger;
  userId: string;
  testId: string;
  input: SubmitTestInput;
  layout: HandLayoutPrefs;
  /** The PRE-update bigram map submit already loaded (deltasFor never
   *  mutates it). */
  bigramStates: ModelMap;
  wasCold: boolean;
};

/** Why a run stores no digest, for the debug log (never user data). */
function skipReason(input: SubmitTestInput): string | null {
  // Only completed runs are analysed (the pooled models read nothing else).
  if (!input.wasCompleted) return "incomplete";
  if (!input.ctx || !input.edits || !input.spaces) return "not-v2";
  if (input.ctx.suddenDeath === true) return "sudden-death";
  if (input.ctx.capped === true) return "capped";
  return null;
}

/** Why an analysis can't be stored, or null when it can (J7). */
function unusableReason(a: RunAnalysis | null): string | null {
  if (!a) return "no-analysis";
  if (!a.slices) return "no-budget";
  if (a.quality.capture !== 2) return "capture-v1";
  if (!a.quality.replayOk) return "replay-mismatch";
  return null;
}

/** Analyse a submitted run with the same engine the result screen runs,
 *  and store its digest in test_analyses (spec-30 §4.1). Called by
 *  adapt.submit after the tests row is written, so a digest never exists
 *  without its test.
 *
 *  Never throws: a missing table (an unmigrated dev DB), an engine error
 *  or a failed insert is logged as a warning and the submit carries on.
 *  Only v2 capture that replays cleanly and hit no cap is stored (J7), so
 *  pooled models never mix capture versions. Logs carry no payload, no
 *  timings and no keys (A4). */
export async function recordTestAnalysis(args: RecordAnalysisArgs): Promise<void> {
  const { db, log, userId, testId, input, layout, bigramStates, wasCold } = args;
  try {
    const skipped = skipReason(input);
    if (skipped) return log.debug("analysis skipped", { reason: skipped });
    const ctx = input.ctx!;

    const run = submitToRunInput(input);
    if (!run) return log.debug("analysis skipped", { reason: "no-length-mode" });

    const a = analyseRun(run);
    const unusable = unusableReason(a);
    if (unusable || !a) return log.debug("analysis skipped", { reason: unusable });

    const trackedPairs = wasCold
      ? []
      : weakestPatterns(
          { bigrams: bigramStates, trigrams: new Map(), words: new Map() },
          layout,
          { pairs: TRACKED_PAIRS, trigrams: 0, words: 0 },
        ).pairs.map((p) => p.key);
    const diff = wasCold ? null : passageDifficulty(input.words, bigramStates, layout);
    const std = fingerMapHash(layout) === fingerMapHash(DEFAULT_HAND_LAYOUT);
    const inputKind = ctx.input ?? inputKindOf(input.timings);
    const digest = buildDigest(a, {
      acc: input.accuracy,
      wpm: input.wpm,
      trackedPairs,
      diff,
      ctx: digestContext(ctx, inputKind, std, a.quality.qwerty),
    });
    const bucket = runBucketKey(
      { mode: input.mode, lengthMode: run.lengthMode, length: input.durationOrWordCount },
      digest.ctx.input === "touch",
    );

    await db.testAnalyses.insert({
      testId,
      userId,
      startedAt: new Date(input.startedAt),
      bucket,
      version: digest.v,
      digest,
    });
  } catch (err) {
    log.warn("test analysis not stored", {
      userId,
      testId,
      reason: isMissingTable(err, "test_analyses")
        ? "table-missing"
        : err instanceof Error
          ? err.name
          : "unknown",
    });
  }
}
