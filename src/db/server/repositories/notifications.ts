import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  notifications,
  type NotificationRow,
} from "@/db/schema/server/notifications";
import type { ServerDrizzle } from "../driver";

/** Cap on the per-user notification list. 50 is well below the noise
 *  floor for any realistic user (a daily player would have to log in
 *  every day for ~7 weeks before brushing it) and keeps the query
 *  bounded without a janitor job. The unread count is computed
 *  separately so it stays correct even if the user has > 50 unread. */
export const NOTIFICATION_LIST_LIMIT = 50;

/** Idempotency-key helper for the personal-best path. Two test rows
 *  with the same `(userId, kind, dedupeKey)` will never both create a
 *  PB notification — the SQL insert is guarded by an existence check
 *  inside `createIfAbsent`. Used so a duplicate adapt.submit (which
 *  shouldn't happen, but isn't impossible) doesn't double-fire. */
export type CreateInput = {
  userId: string;
  kind: string;
  title: string;
  body: string;
  data?: unknown;
  /** Optional idempotency key. When provided, `createIfAbsent` skips
   *  the insert if a row with the same `(userId, kind, dedupeKey)`
   *  exists. The key is stashed inside the `data` blob under
   *  `__dedupe` so the existing column set stays intact. */
  dedupeKey?: string;
};

export function notificationsRepo(db: ServerDrizzle) {
  return {
    /** Newest-first per user, capped at `NOTIFICATION_LIST_LIMIT`. */
    async listForUser(userId: string): Promise<NotificationRow[]> {
      return db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(NOTIFICATION_LIST_LIMIT);
    },

    /** Unread total — independent of the list cap. */
    async unreadCountForUser(userId: string): Promise<number> {
      const rows = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            isNull(notifications.readAt),
          ),
        );
      return rows[0]?.n ?? 0;
    },

    /** Unconditional insert. The kind / data shape isn't validated
     *  here — the caller (route, server helper, or migration script)
     *  owns the payload's correctness. */
    async create(input: CreateInput): Promise<NotificationRow> {
      const id = randomUUID();
      const payload = mergeDedupe(input.data, input.dedupeKey);
      const [row] = await db
        .insert(notifications)
        .values({
          id,
          userId: input.userId,
          kind: input.kind,
          title: input.title,
          body: input.body,
          data: payload,
        })
        .returning();
      if (!row) throw new Error("notifications.create returned no row");
      return row;
    },

    /** Insert only when no row matches `(userId, kind, dedupeKey)`.
     *  Returns the existing row if one is already there (so the
     *  caller can still log the absorbed dedupe), or the freshly
     *  inserted row. `dedupeKey` is required — for unconditional
     *  inserts call `create` directly.
     *
     *  Idempotency is enforced by the partial unique index
     *  `notifications_dedupe_uidx` (see schema). Concurrent writers
     *  collide at the index; one wins, the other sees an empty
     *  RETURNING and falls through to the SELECT to recover the
     *  winner's row. */
    async createIfAbsent(
      input: CreateInput & { dedupeKey: string },
    ): Promise<{ row: NotificationRow; created: boolean }> {
      const id = randomUUID();
      const payload = mergeDedupe(input.data, input.dedupeKey);
      const inserted = await db
        .insert(notifications)
        .values({
          id,
          userId: input.userId,
          kind: input.kind,
          title: input.title,
          body: input.body,
          data: payload,
        })
        .onConflictDoNothing()
        .returning();
      if (inserted[0]) return { row: inserted[0], created: true };
      // Conflict path — fetch the winning row.
      const existing = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, input.userId),
            eq(notifications.kind, input.kind),
            // Inline jsonb key match — Postgres `->>` extracts the
            // text value at the `__dedupe` key.
            sql`${notifications.data} ->> '__dedupe' = ${input.dedupeKey}`,
          ),
        )
        .limit(1);
      if (!existing[0]) {
        throw new Error(
          "notifications.createIfAbsent: conflict reported but no matching row",
        );
      }
      return { row: existing[0], created: false };
    },

    /** Mark one row read. No-op if the id doesn't belong to the
     *  user (the `userId` predicate keeps cross-account writes
     *  impossible). */
    async markRead(userId: string, id: string): Promise<void> {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.id, id),
            isNull(notifications.readAt),
          ),
        );
    },

    /** Mark every unread row for the user as read. Single statement
     *  so this stays cheap even on a user with many notifications. */
    async markAllRead(userId: string): Promise<void> {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.userId, userId),
            isNull(notifications.readAt),
          ),
        );
    },
  };
}

/** Embed the dedupe key inside the `data` blob so we don't have to
 *  add a column for it. The notification render path ignores
 *  `__dedupe` — see the renderer in notifications-popover.tsx. */
function mergeDedupe(data: unknown, dedupeKey: string | undefined): unknown {
  if (!dedupeKey) return data ?? null;
  if (data == null) return { __dedupe: dedupeKey };
  if (typeof data !== "object" || Array.isArray(data)) {
    return { __dedupe: dedupeKey, value: data };
  }
  return { ...(data as Record<string, unknown>), __dedupe: dedupeKey };
}

export type NotificationsRepo = ReturnType<typeof notificationsRepo>;
