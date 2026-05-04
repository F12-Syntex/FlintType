import { eq, sql } from "drizzle-orm";
import { userPrefs } from "@/db/schema/server/user-prefs";
import type { ServerDrizzle } from "../driver";

export type UserPrefsBlob = Record<string, unknown>;

export function userPrefsRepo(db: ServerDrizzle) {
  return {
    /** Returns the stored blob for `userId`, or `{}` when there's no
     *  row yet — callers always get an object back. */
    async get(userId: string): Promise<UserPrefsBlob> {
      const rows = await db
        .select({ data: userPrefs.data })
        .from(userPrefs)
        .where(eq(userPrefs.userId, userId))
        .limit(1);
      const data = rows[0]?.data;
      return (data && typeof data === "object" ? data : {}) as UserPrefsBlob;
    },

    /** Upsert. Replaces the stored blob wholesale — the client is the
     *  source of truth for the merged shape, so partial merges happen
     *  there. Updates the `updatedAt` stamp on every write. */
    async set(userId: string, data: UserPrefsBlob): Promise<void> {
      await db
        .insert(userPrefs)
        .values({ userId, data })
        .onConflictDoUpdate({
          target: userPrefs.userId,
          set: { data, updatedAt: sql`now()` },
        });
    },
  };
}

export type UserPrefsRepo = ReturnType<typeof userPrefsRepo>;
