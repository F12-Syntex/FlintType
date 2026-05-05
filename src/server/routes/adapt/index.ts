import { randomUUID } from "node:crypto";
import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import {
  bigramRowsToStates,
  motorFeatureRowsToStates,
  trigramRowsToStates,
  deltasFor,
} from "@/server/adapt/apply";
import { fingerMapHash } from "@/server/adapt/key-map";
import { extract } from "@/server/adapt/measure";
import { advanceRecency, selectWords } from "@/server/adapt/select";
import { RECENCY_RECOVERY_TESTS } from "@/server/adapt/scoring";
import { DEFAULT_HAND_LAYOUT, type HandLayoutPrefs } from "@/lib/hand-layout";
import {
  type RequestWordsInput,
  type RequestWordsOutput,
  type SubmitTestInput,
  type SubmitTestOutput,
  requestWordsInputSchema,
  submitTestInputSchema,
} from "@/types/adapt";
import type { Database } from "@/db/server";

// ─── Helpers shared by both routes ───────────────────────────────────
//
// The two routes both need the same handful of reads from the
// user_prefs blob — handLayout, adaptRecency, adaptFingerMapHash. The
// prefs blob is opaque to the server (R-shaped JSON), so we cast at
// the boundary. Centralising the casts here keeps the route bodies
// readable and the unsafe code in one place.

type AdaptPrefs = {
  handLayout: HandLayoutPrefs;
  adaptRecency: Map<string, number>;
  adaptFingerMapHash: string | null;
  raw: Record<string, unknown>;
};

async function loadAdaptPrefs(
  db: Database,
  userId: string,
): Promise<AdaptPrefs> {
  const raw = await db.userPrefs.get(userId);
  const layout =
    (raw.handLayout as HandLayoutPrefs | undefined) ?? DEFAULT_HAND_LAYOUT;
  const recency = new Map<string, number>(
    Object.entries(
      (raw.adaptRecency as Record<string, number> | undefined) ?? {},
    ),
  );
  const hash =
    (raw.adaptFingerMapHash as string | undefined | null) ?? null;
  return {
    handLayout: layout,
    adaptRecency: recency,
    adaptFingerMapHash: hash,
    raw,
  };
}

async function persistAdaptPrefs(
  db: Database,
  userId: string,
  prefs: AdaptPrefs,
  patch: { adaptRecency?: Map<string, number>; adaptFingerMapHash?: string },
): Promise<void> {
  const next: Record<string, unknown> = { ...prefs.raw };
  if (patch.adaptRecency)
    next.adaptRecency = Object.fromEntries(patch.adaptRecency);
  if (patch.adaptFingerMapHash !== undefined)
    next.adaptFingerMapHash = patch.adaptFingerMapHash;
  await db.userPrefs.set(userId, next);
}

// ─── adapt.submit ────────────────────────────────────────────────────

const submit = defineRoute<SubmitTestInput, SubmitTestOutput>({
  input: submitTestInputSchema,
  handler: async ({ input, db, meta, log }) => {
    const userId = meta.userId as string;
    const prefs = await loadAdaptPrefs(db, userId);

    // If the user's finger map has changed since the last submit,
    // wipe the motor-feature model — its keys describe a layout
    // that no longer exists. Bigrams and trigrams stay; they're
    // mechanical observations of typed character pairs.
    const currentHash = fingerMapHash(prefs.handLayout);
    const fingerMapChanged =
      prefs.adaptFingerMapHash != null &&
      prefs.adaptFingerMapHash !== currentHash;
    if (fingerMapChanged) {
      log.info("finger map changed — clearing motor-feature model", {
        userId,
      });
      await db.motorFeatureModels.clearForUser(userId);
    }

    const [bigramRows, trigramRows, motorRows] = await Promise.all([
      db.bigramModels.listForUser(userId),
      db.trigramModels.listForUser(userId),
      fingerMapChanged
        ? Promise.resolve([])
        : db.motorFeatureModels.listForUser(userId),
    ]);
    const bigramStates = bigramRowsToStates(bigramRows);
    const trigramStates = trigramRowsToStates(trigramRows);
    const motorStates = motorFeatureRowsToStates(motorRows);

    const baselines = {
      bigram: new Map(
        Array.from(bigramStates, ([k, s]) => [k, s.mean] as const),
      ),
      trigram: new Map(
        Array.from(trigramStates, ([k, s]) => [k, s.mean] as const),
      ),
    };
    const samples = extract(input.timings, prefs.handLayout, baselines);

    await Promise.all([
      db.bigramModels.bulkUpsert(userId, deltasFor(bigramStates, samples.bigrams)),
      db.trigramModels.bulkUpsert(
        userId,
        deltasFor(trigramStates, samples.trigrams),
      ),
      db.motorFeatureModels.bulkUpsert(
        userId,
        deltasFor(motorStates, samples.motorFeatures),
      ),
    ]);

    const testId = randomUUID();
    await db.tests.insert({
      id: testId,
      userId,
      startedAt: new Date(input.startedAt),
      completedAt: new Date(input.completedAt),
      mode: input.mode,
      durationOrWordCount: input.durationOrWordCount,
      wpm: input.wpm,
      accuracy: input.accuracy,
      errorCount: input.errorCount,
      resetCount: input.resetCount,
      wasCompleted: input.wasCompleted,
    });

    const nextRecency = advanceRecency(
      prefs.adaptRecency,
      input.words,
      RECENCY_RECOVERY_TESTS,
    );
    await persistAdaptPrefs(db, userId, prefs, {
      adaptRecency: nextRecency,
      adaptFingerMapHash: currentHash,
    });

    return {
      testId,
      measurementsAccepted: samples.accepted,
      measurementsRejected: samples.rejected,
    };
  },
});

// ─── adapt.words ─────────────────────────────────────────────────────

const words = defineRoute<RequestWordsInput, RequestWordsOutput>({
  input: requestWordsInputSchema,
  handler: async ({ input, db, meta }) => {
    const userId = meta.userId as string;
    const prefs = await loadAdaptPrefs(db, userId);

    const [bigramRows, trigramRows, motorRows, recentTests] =
      await Promise.all([
        db.bigramModels.listForUser(userId),
        db.trigramModels.listForUser(userId),
        db.motorFeatureModels.listForUser(userId),
        db.tests.recentForUser(userId, 5),
      ]);

    const result = selectWords({
      count: input.count,
      pool: input.pool,
      bigramModels: bigramRowsToStates(bigramRows),
      trigramModels: trigramRowsToStates(trigramRows),
      motorFeatureModels: motorFeatureRowsToStates(motorRows),
      layout: prefs.handLayout,
      recentTests,
      recentlyShown: prefs.adaptRecency,
    });

    return result;
  },
});

export const adapt = defineNamespace({
  middleware: [requireAuth],
  routes: { submit, words },
});
