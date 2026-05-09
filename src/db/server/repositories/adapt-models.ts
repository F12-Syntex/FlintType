import { and, eq, inArray, sql } from "drizzle-orm";
import {
  bigramModels,
  motorFeatureModels,
  trigramModels,
} from "@/db/schema/server/adapt-models";
import { wordModels } from "@/db/schema/server/word-models";
import type {
  BigramModelRow,
  ModelDelta,
  MotorFeatureModelRow,
  TrigramModelRow,
  WordModelRow,
} from "@/types/adapt";
import type { ServerDrizzle } from "../driver";

// ─── Bigram model ─────────────────────────────────────────────────────
//
// list/get/bulkUpsert/clearForUser — same trio appears for every
// running-statistics table. Keeping the three repos side by side in
// one file because they share a rationale and a shape; the diffs
// between them are noise rather than signal.

export function bigramModelsRepo(db: ServerDrizzle) {
  return {
    async listForUser(userId: string): Promise<BigramModelRow[]> {
      return db
        .select()
        .from(bigramModels)
        .where(eq(bigramModels.userId, userId));
    },

    async getMany(
      userId: string,
      keys: readonly string[],
    ): Promise<BigramModelRow[]> {
      if (keys.length === 0) return [];
      return db
        .select()
        .from(bigramModels)
        .where(
          and(
            eq(bigramModels.userId, userId),
            inArray(bigramModels.bigram, keys as string[]),
          ),
        );
    },

    async bulkUpsert(
      userId: string,
      deltas: ReadonlyMap<string, ModelDelta>,
    ): Promise<void> {
      if (deltas.size === 0) return;
      const rows = Array.from(deltas, ([bigram, d]) => ({
        userId,
        bigram,
        meanMs: d.meanMs,
        varianceMs: d.varianceMs,
        sampleCount: d.sampleCount,
      }));
      await db
        .insert(bigramModels)
        .values(rows)
        .onConflictDoUpdate({
          target: [bigramModels.userId, bigramModels.bigram],
          set: {
            meanMs: sql`excluded.mean_ms`,
            varianceMs: sql`excluded.variance_ms`,
            sampleCount: sql`excluded.sample_count`,
            updatedAt: sql`now()`,
          },
        });
    },

    async clearForUser(userId: string): Promise<void> {
      await db.delete(bigramModels).where(eq(bigramModels.userId, userId));
    },
  };
}
export type BigramModelsRepo = ReturnType<typeof bigramModelsRepo>;

// ─── Trigram model ────────────────────────────────────────────────────

export function trigramModelsRepo(db: ServerDrizzle) {
  return {
    async listForUser(userId: string): Promise<TrigramModelRow[]> {
      return db
        .select()
        .from(trigramModels)
        .where(eq(trigramModels.userId, userId));
    },

    async getMany(
      userId: string,
      keys: readonly string[],
    ): Promise<TrigramModelRow[]> {
      if (keys.length === 0) return [];
      return db
        .select()
        .from(trigramModels)
        .where(
          and(
            eq(trigramModels.userId, userId),
            inArray(trigramModels.trigram, keys as string[]),
          ),
        );
    },

    async bulkUpsert(
      userId: string,
      deltas: ReadonlyMap<string, ModelDelta>,
    ): Promise<void> {
      if (deltas.size === 0) return;
      const rows = Array.from(deltas, ([trigram, d]) => ({
        userId,
        trigram,
        meanMs: d.meanMs,
        varianceMs: d.varianceMs,
        sampleCount: d.sampleCount,
      }));
      await db
        .insert(trigramModels)
        .values(rows)
        .onConflictDoUpdate({
          target: [trigramModels.userId, trigramModels.trigram],
          set: {
            meanMs: sql`excluded.mean_ms`,
            varianceMs: sql`excluded.variance_ms`,
            sampleCount: sql`excluded.sample_count`,
            updatedAt: sql`now()`,
          },
        });
    },

    async clearForUser(userId: string): Promise<void> {
      await db.delete(trigramModels).where(eq(trigramModels.userId, userId));
    },
  };
}
export type TrigramModelsRepo = ReturnType<typeof trigramModelsRepo>;

// ─── Motor-feature model ──────────────────────────────────────────────

export function motorFeatureModelsRepo(db: ServerDrizzle) {
  return {
    async listForUser(userId: string): Promise<MotorFeatureModelRow[]> {
      return db
        .select()
        .from(motorFeatureModels)
        .where(eq(motorFeatureModels.userId, userId));
    },

    async bulkUpsert(
      userId: string,
      deltas: ReadonlyMap<string, ModelDelta>,
    ): Promise<void> {
      if (deltas.size === 0) return;
      const rows = Array.from(deltas, ([featureKey, d]) => ({
        userId,
        featureKey,
        meanMs: d.meanMs,
        varianceMs: d.varianceMs,
        sampleCount: d.sampleCount,
      }));
      await db
        .insert(motorFeatureModels)
        .values(rows)
        .onConflictDoUpdate({
          target: [motorFeatureModels.userId, motorFeatureModels.featureKey],
          set: {
            meanMs: sql`excluded.mean_ms`,
            varianceMs: sql`excluded.variance_ms`,
            sampleCount: sql`excluded.sample_count`,
            updatedAt: sql`now()`,
          },
        });
    },

    /** Called when the user reconfigures their finger map — the
     *  motor-feature meanings depend on which keys belong to which
     *  finger, so prior measurements no longer describe the same
     *  thing. Bigram and trigram tables stay intact. */
    async clearForUser(userId: string): Promise<void> {
      await db
        .delete(motorFeatureModels)
        .where(eq(motorFeatureModels.userId, userId));
    },
  };
}
export type MotorFeatureModelsRepo = ReturnType<typeof motorFeatureModelsRepo>;

// ─── Word model ───────────────────────────────────────────────────────
//
// Per-user, per-word total typing time. Same Welford trio (list / get /
// bulkUpsert / clearForUser) — different keying column. Surfaced
// alongside bigram and trigram weakness on the history page so the
// "worst words" panel and the worst-words drill can read straight off
// it.

export function wordModelsRepo(db: ServerDrizzle) {
  return {
    async listForUser(userId: string): Promise<WordModelRow[]> {
      return db
        .select()
        .from(wordModels)
        .where(eq(wordModels.userId, userId));
    },

    async getMany(
      userId: string,
      keys: readonly string[],
    ): Promise<WordModelRow[]> {
      if (keys.length === 0) return [];
      return db
        .select()
        .from(wordModels)
        .where(
          and(
            eq(wordModels.userId, userId),
            inArray(wordModels.word, keys as string[]),
          ),
        );
    },

    async bulkUpsert(
      userId: string,
      deltas: ReadonlyMap<string, ModelDelta>,
    ): Promise<void> {
      if (deltas.size === 0) return;
      const rows = Array.from(deltas, ([word, d]) => ({
        userId,
        word,
        meanMs: d.meanMs,
        varianceMs: d.varianceMs,
        sampleCount: d.sampleCount,
      }));
      await db
        .insert(wordModels)
        .values(rows)
        .onConflictDoUpdate({
          target: [wordModels.userId, wordModels.word],
          set: {
            meanMs: sql`excluded.mean_ms`,
            varianceMs: sql`excluded.variance_ms`,
            sampleCount: sql`excluded.sample_count`,
            updatedAt: sql`now()`,
          },
        });
    },

    async clearForUser(userId: string): Promise<void> {
      await db.delete(wordModels).where(eq(wordModels.userId, userId));
    },
  };
}
export type WordModelsRepo = ReturnType<typeof wordModelsRepo>;
