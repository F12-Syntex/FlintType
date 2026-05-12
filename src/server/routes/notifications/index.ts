import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  markReadInputSchema,
  type ListNotificationsOutput,
  type MarkReadInput,
  type Notification,
  type NotificationData,
} from "@/types/notification";

/** GET equivalent — list newest-first, with the server-computed
 *  unread count so the bell badge isn't a count over the limited
 *  list slice. */
const list = defineRoute<void, ListNotificationsOutput>({
  handler: async ({ db, meta }) => {
    const userId = meta.userId as string;
    const [rows, unreadCount] = await Promise.all([
      db.notifications.listForUser(userId),
      db.notifications.unreadCountForUser(userId),
    ]);
    const items: Notification[] = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      data: stripInternalFields(r.data) as NotificationData,
      createdAtMs: r.createdAt.getTime(),
      readAtMs: r.readAt ? r.readAt.getTime() : null,
    }));
    return { items, unreadCount };
  },
});

const markRead = defineRoute<MarkReadInput, void>({
  input: markReadInputSchema,
  handler: async ({ input, db, meta }) => {
    await db.notifications.markRead(meta.userId as string, input.id);
  },
});

const markAllRead = defineRoute<void, void>({
  handler: async ({ db, meta }) => {
    await db.notifications.markAllRead(meta.userId as string);
  },
});

/** `requireAuth` first → `rateLimit` second, so the bucket keys by
 *  Clerk user id (per-user budget) rather than IP. 60/min covers a
 *  heavily-popped notifications popover (bell open, scroll,
 *  mark-individual, mark-all) and stops a scripted caller from
 *  spamming the mark-read endpoint. */
export const notifications = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 60, windowMs: 60_000 })],
  routes: { list, markRead, markAllRead },
});

/** The repo embeds `__dedupe` (idempotency key) inside the data
 *  blob. The client has no business seeing that — strip it before
 *  serialisation. Any other plain-object payload passes through
 *  unchanged. */
function stripInternalFields(data: unknown): unknown {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return data ?? null;
  }
  const { __dedupe: _drop, ...rest } = data as Record<string, unknown>;
  void _drop;
  return rest;
}
